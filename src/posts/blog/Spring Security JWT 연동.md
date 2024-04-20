---
title: Spring Security JWT 연동
category:
  - TroubleShooting
desc: 스프링 시큐리티에서 JWT 토큰을 사용하여 인증을 처리하는 방법에 대해서 알아보자.
thumbnail: ./images/springsecurity.jpeg
alt: 스프링 시큐리티 이미지
createdAt: 2024-04-20 14:51
updatedAt: 2024-04-20 14:53
tags:
  - Posting
  - TroubleShooting
  - JWT
  - SpringSecurity
isFinished: true
---
## 문제 상황
### Spring Security JWT 연동

Spring Security와 JWT 토큰을 연동하는 과정에서 문제가 발생하였다. 현재 프로젝트에서 `Spring OAuth2` 방식의 로그인을 사용하기에 만약, 인증 되지 않은 유저가 데이터를 요청 보낸다면 자동으로 OAuth2 로그인 페이지로 리다이렉트 시킨다. 물론, 스프링을 프론트로 사용하고, 리다이렉트 URL을 직접 지정해준다면 별 문제가 없지만, 스프링을 오로지 백엔드로 사용할 때는 아래 이미지와 같이 인증이 필요한 URL에서 다음 사진과 같은 에러가 발생한다.

![미인가 요청 테스트](https://i.imgur.com/UeKgLgs.png)


이렇게, 로그인이 되지 않았다는 응답이 아닌 HTML 응답(302 리다이렉트 응답의 결과)이 오기에 어떤 부분에 문제가 생겨서 인증처리가 안되었는지 확인할 수 없다. 따라서, 이를 401 응답과 함께 에러가 발생하도록 수정하고자 한다.

### 스프링 시큐리티에 필터 추가

스프링 시큐리티에는 여러 필터가 존재한다. 실제로 디버그를 찍어보면 아래와 같이 수 없이 많은 필터가 연결된 것을 알 수 있다. 

<p align="center">
<img src="https://i.imgur.com/9DMNMz1.png" alt="스프링 시큐리티 필터"/>
</p>

위 사진과 같이 총 16개의 필터가 순서대로 실행되며 필터에서 특정한 프로세스를 실행하고, 다음 필터를 실행시키는 방식으로 이루어져있다. 그렇다면, 로그인이 되지 않은 사용자가 접속하게 된다면 이를 로그인 페이지로 리다이렉트 시키는 필터를 찾아 더 이상 리다이렉트 시키지 않도록 만든다면 문제가 없을 것이다.

아래와 같이 2가지 필터를 추가해준다면 로그인 페이지 대신 정상적인 로그인 실패 오류가 나오는 것을 알 수 있다. 

```java
@Override  
protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {  
    String accessToken = resolveToken(request);  
    try {  
        if (StringUtils.hasText(accessToken) && jwtTokenService.validateToken(accessToken)) {  
            Authentication authentication = jwtTokenService.parseAuthentication(accessToken);  
            SecurityContextHolder.getContext().setAuthentication(authentication);  
            log.debug("Security Context에 '{}' 인증 정보를 저장했습니다", authentication.getName());  
        } else {  
            throw new JwtException("유효한 JWT 토큰이 없습니다");  
        }  
    } catch (Exception e) {  
        log.debug("인증 처리에 실패하였습니다.: {}", e.getMessage());  
        throw new JwtException(e.getMessage());  
    }  
  
    filterChain.doFilter(request, response);  
}
```

```java
@Override  
protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {  
	try {  
		filterChain.doFilter(request, response);  
	} catch (Exception e) {  
		BranduException exception = new BranduException(ErrorCode.INVALID_TOKEN);  
		ErrorResponse errorResponse = new ErrorResponse(exception, e.getLocalizedMessage());  
		response.setStatus(exception.getErrorCode().getStatus().value());  
		response.setContentType("application/json;charset=UTF-8");  
		response.getWriter().write(errorResponse.toJson());  
	}  
}  
```

다음과 같이 JWT 인증을 확인하는 `JwtFilter`와 `AuthExceptionFilter` 클래스를 생성하고, 이를 필터로 등록시켜주면 인증이 되지 않은 사용자는 아래 사진처럼 로그인 페이지로 리다이렉트 시키는 것이 아닌, 인증이 되지 않았다는 에러가 발생한 것을 알 수 있다.

![](https://i.imgur.com/pBWtpXG.png)

하지만, 이렇게 구현하게되면 심각한 오류를 발생하게 되는데 바로 모든 HTTP 요청이 전부 해당 필터에서 필터에서 설정한 인증을 요구하지 않는 엔드포인트까지 인증을 거치게 된다는 문제가 발생한다. 

```java
// 아래 설정을 통해 인증이 필요하지 않은 엔드포인트를 설정할 수 있다.
.authorizeHttpRequests(  
        registry -> registry.requestMatchers("/api/v1/auth/**", "/actuator/**", "/h2-console").permitAll()  
                .anyRequest().authenticated()  
)
```

### 스프링 시큐리티에서 실행되는 필터 종류

필터에 대해서 정확히 이해하기 위해 스프링 시큐리티 공식 문서를 확인하여 필터 동작 과정에 대해서 살펴보던 중 다음과 같은 결과를 보게 되었다. 위 사진은 스프링 시큐리티 설정과 설정과 연관된 필터에 대한 사진이고, 하단의 텍스트는 스프링 시큐리티에서 실행되는 필터의 종류 및 순서이다.

![스프링 필터가 적용되는 것](https://i.imgur.com/zbFe1IA.png)

```text
2023-06-14T08:55:22.321-03:00  INFO 76975 --- [           main] o.s.s.web.DefaultSecurityFilterChain     : Will secure any request with [
org.springframework.security.web.session.DisableEncodeUrlFilter@404db674,
org.springframework.security.web.context.request.async.WebAsyncManagerIntegrationFilter@50f097b5,
org.springframework.security.web.context.SecurityContextHolderFilter@6fc6deb7,
org.springframework.security.web.header.HeaderWriterFilter@6f76c2cc,
org.springframework.security.web.csrf.CsrfFilter@c29fe36,
org.springframework.security.web.authentication.logout.LogoutFilter@ef60710,
org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter@7c2dfa2,
org.springframework.security.web.authentication.ui.DefaultLoginPageGeneratingFilter@4397a639,
org.springframework.security.web.authentication.ui.DefaultLogoutPageGeneratingFilter@7add838c,
org.springframework.security.web.authentication.www.BasicAuthenticationFilter@5cc9d3d0,
org.springframework.security.web.savedrequest.RequestCacheAwareFilter@7da39774,
org.springframework.security.web.servletapi.SecurityContextHolderAwareRequestFilter@32b0876c,
org.springframework.security.web.authentication.AnonymousAuthenticationFilter@3662bdff,
org.springframework.security.web.access.ExceptionTranslationFilter@77681ce4,
org.springframework.security.web.access.intercept.AuthorizationFilter@169268a7]
```

가장 먼저 URL 인코딩에 대한 필터가 실행되고, Spring Context를 설정하거나 CSRF와 같은 필터가 실행되고, 인증과 관련된 필터가 실행되고, 가장 마지막에 `AuthorizationFilter`가 실행된다. 또한, 이 `AuthorizationFilter`가 우리가  `authorizeHttpRequests`에서 설정한 인증을 처리할 엔드포인트와 인증을 처리하지 않을 엔드포인트를 결정하는 부분인 것을 확인할 수 있다. 위에서 분명 Authentication 필터가 적용되어 인증과 관련된 로직을 처리 하였지만, Authorization 필터가 한번 더 적용된다는 것은 두 필터는 차이가 있다는 것이고, 이 차이에 대해서 알아야지만 위에서 발생한 문제를 해결할 수 있다.

### Authentication VS Authorization

그렇다면 Authentication과 Authorization의 차이에 대해서 알아보자. 두 단어를 번역해보면 각각 인증과 인가이다. 현재 문제 상황과 연관하여 설명하자면 JWT 토큰의 유효성을 검사하여 로그인 처리를 하는 것은 인증에 대한 부분이고, 인증이 필요 없는 엔드포인트를 설정하기 위해서는 인가에 대한 부분인 것이다. 따라서, 인증과 인가 부분을 나눠서 처리해야한다. 인증 처리는 기존 방식과 같이 `UserPasswordAuthentication` 이전에 필터를 추가하여 처리하면 되지만, 인가를 필터로 처리하는 것이 아닌 스프링의 `AuthorizationFilter` 에서 처리하는 것이 일반적이다.

따라서, 기존 JWT 인증을 처리하는 구조를 수정하고 스프링 시큐리티에서 제공하는 기능을 활용하여 문제를 해결하기로 하였다.

### 스프링 시큐리티에서 인가를 처리하는 방식

<p align="center">
	<img src="https://velog.velcdn.com/images/gwichanlee/post/7d5e93ac-eea0-4e3c-9699-dcc0d9a54ec4/image.png" alt="스프링 시큐리티에서 인가를 처리하는 방식"/>
</p>

위 사진은 스프링 시큐리티에서 인가를 처리하는 방식을 나타내는 사진이다. 만약, 필터에서 인증 혹은 인가를 불허하는 에러가 발생하게 된다면 스프링 시큐리티 내부에 존재하는 `ExceptionTranslactionFilter`를 통해 각 방식에 대한 예외를 변환(인증 예외인지 인가 예외인지) 해주게 되고, 각각의 에러에 따라서 다른 핸들링이 필요하다.

## 해결 방법

### 예외를 처리하는 핸들러 만들기

먼저, 인증 예외가 발생한 경우 `AuthenticationException` 예외가 발생하게 되고 이는 `AutehnticationEntryPoint` 라는 핸들러를 사용하여 예외를 처리해야한다. 이때, 필터는 스프링 컨테이너에서 실행되는 것이 아닌 서블릿 컨테이너에서 실행되기 때문에 스프링에서 제공하는 JSON 직렬화를 사용할 수 없다. 따라서, 직접 직렬화를 처리해주어야 한다. 인증과 관련된 예외는 401 상태코드를 발생시키면 된다.

```java
@Component  
public class BranduAuthenticationEntryPoint implements AuthenticationEntryPoint {  
    @Override  
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException authException) throws IOException {  
  
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);  
        BranduException exception = new BranduException(ErrorCode.INVALID_TOKEN);  
        ErrorResponse errorResponse = new ErrorResponse(exception, authException.getMessage());  
        response.setContentType("application/json;charset=UTF-8");  
        response.getWriter().write(errorResponse.toJson());  
    }  
}
```

위 코드와 같이 직접 예외에 담긴 내용을 직접 직렬화 처리해주고 난다면 인증 처리에서 발생한 에러를 정상적으로 처리할 수 있게 된다. 

다음으로, 인가 예외가 발생한 경우 `AccessDeniedException` 예외가 발생하게 되며 `AccessDeniedHandler`를 사용하여 예외를 처리해야한다. 해당 예외는 특정한 권한이 없는데 권한이 필요한 리소스에 접근한 경우 발생하는 예외이다. 이 경우 역시 서블릿 컨테이너에서 동작하기에 직렬화 처리를 직접 해주어야한다. 또한, 인가와 관련된 예외는 **인증은 유효하지만, 권한이 없는 경우**이기에 401 예외가 아닌 403 상태코드를 던져주어야 한다.

```java
@Component  
public class BranduAuthenticationDeniedHandler implements AccessDeniedHandler {  
    @Override  
    public void handle(HttpServletRequest request, HttpServletResponse response, AccessDeniedException accessDeniedException) throws IOException, ServletException {  
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);  
        BranduException exception = new BranduException(ErrorCode.ACCESS_DENIED);  
        ErrorResponse errorResponse = new ErrorResponse(exception, accessDeniedException.getMessage());  
        response.setContentType("application/json;charset=UTF-8");  
        response.getWriter().write(errorResponse.toJson());  
    }  
}
```

### 예외 핸들러 스프링 시큐리티에 등록하기

다음과 같이 각각의 예외를 처리하는 핸들러를 만들었다면 스프링 시큐리티에 인증 및 인가와 관련된 예외가 발생한 경우 정의한 방식으로 처리하도록 등록해주어야 한다.

```java
.exceptionHandling(configurer -> configurer  
        .authenticationEntryPoint(branduAuthenticationEntryPoint)  
        .accessDeniedHandler(branduAuthenticationDeniedHandler)  
)
```

위 코드와 같이 예외를 스프링 시큐리티에 등록하게 된다면 이제 문제를 해결할 수 있게된다. 이를 확인하기 위해 다음과 같이 테스트 코드를 작성하였다. 인증을 하지 않는 요청의 경우 아무런 데이터를 넣지 않고 요청을 보냈으며, 인증이 들어간 요청의 경우 `@WithMockUser` 어노테이션을 사용하여 인증이 되어있다는 상태로 요청을 보냈다.

```java
@Test  
@DisplayName("인증을_하지않고_로그인_테스트")  
public void 인증을_하지않고_로그인_테스트() throws Exception {  
    // GIVEN  
    mockMvc.perform(get("/api/v1/users/test").contentType(MediaType.APPLICATION_JSON))  
            .andDo(print())  
            .andExpect(status().isUnauthorized());  
}  
  
@Test  
@DisplayName("인증을_포함한_로그인_테스트")  
@WithMockUser(username = "test", roles = "USER")  
public void 인증을_포함한_로그인_테스트() throws Exception {  
    // GIVEN  
    mockMvc.perform(get("/api/v1/users/test").contentType(MediaType.APPLICATION_JSON))  
            .andDo(print())  
            .andExpect(status().isOk());  
}
```

테스트 코드를 실행해보면, 인증을 하지 않는 경우 401 예외를 정상적으로 던지는 것을 확인할 수 있으며 인증이 포함된 테스트의 경우 정상적으로 처리 되었다는 200 응답이 온 것을 확인할 수 있다.

<p align="center">
	<img src="https://i.imgur.com/vGv8YBH.png" alt="인증 관련 테스트 코드 결과"/>
</p>

## 예외 메시지 수정하기


---
## 참고 자료

[Spring Security OAuth2 always redirects to /login page having a valid Bearer header](https://stackoverflow.com/questions/43308625/spring-security-oauth2-always-redirects-to-login-page-having-a-valid-bearer-hea)  
[Spring Security Architecture](https://spring.io/guides/topicals/spring-security-architecture) 
[Spring Security의 Filter를 알아보자!](https://upsw-p.tistory.com/57)  
[JWT 필터 적용 과정](https://velog.io/@chullll/Spring-Security-JWT-%ED%95%84%ED%84%B0-%EC%A0%81%EC%9A%A9-%EA%B3%BC%EC%A0%95)  
[비슷해보이지만 다른 두 친구를 소개합니다. Authentication vs Authorization](https://baek.dev/post/24/)  
[Spring Security ExceptionHandling](https://velog.io/@gwichanlee/Spring-Security-ExceptionHandling) 
[Authorization Architecture](https://docs.spring.io/spring-security/reference/servlet/authorization/architecture.html) 

