---
title: OAuth2 인증(소셜 로그인) 방식 구현
category:
  - Spring
desc: 스프링에 소셜 로그인 적용하기
thumbnail: ./images/brandu.png
alt: 브랜뉴 기본 이미지
createdAt: 2024-04-24
updatedAt: 2024-04-26
tags:
  - Posting
  - Spring
  - SpringSecurity
  - OAuth2
isFinished: true
---
## OAuth2 인증 방식이란?

Open Authorization 2.0은 인증을 위한 개방형 표준 프로토콜로, 인증을 처리하는 것을 자체적으로 처리하는 것이 아닌, Third-Party(깃허브, 구글, 카카오 등) 프로그램에게 리소스 소유자(요청 클라이언트)를 대신하여 리소스 서버(인증을 제공하는 서버)에서 제공하는 자원에 대한 접근 권한을 위임하는 방식을 제공한다.

아래와 같은 흐름으로 인증을 처리한다.

<div style="display: flex; flex-direction: column; align-items:center;">
	<img src="https://i.imgur.com/FmaXFVr.png" alt="OAuth2 인증 방식"/>
	<span style="margin-top: 5px; margin-bottom: 5px; color: gray;">출처: 네이버 클라우드 개발자 공식문서</span>
</div>

간단하게 흐름을 설명하면 다음과 같다.

1. 사용자가 프론트엔드 서버에 인증 요청을 보낸다.
2. 프론트엔드에서 백엔드 서버에 인증을 위한 URL을 요청하고, 리소스 서버에 인증 코드를 받을 리다이렉트 URL을 입력하여 보내준다.
3. 사용자가 리소스 서버 UI (카카오 로그인 화면)을 통해 로그인한다.
4. 리소스 서버는 리다이렉트 URL에 인증 코드를 반환해주고, 백엔드 서버는 이 인증 코드를 바탕으로 리소스 서버에 인증 토큰을 다시 요청하게 된다.
5. 리소스 서버를 통해 받은 인증 토큰을 바탕으로 백엔드 서버는 리소스 서버에 존재하는 회원 정보를 조회할 수 있으며, 이를 통해 백엔드 서버는 자체적인 인증 토큰을 제공해준다.

위와 같은 프로세스대로 인증을 구현한다면 구글, 카카오와 같은 소셜 서버에서 회원 정보를 가져와 자체 서버에서 인증 로직을 구현할 수 있게된다.

## 스프링에서 OAuth2 방식 구현하기

### 스프링 OAuth2 인증 흐름

스프링에서 소셜 로그인 인증을 처리하는 흐름을 간단하게 정리하면 아래 사진과 같다.

<div style="display: flex; flex-direction: column; align-items:center;">
	<img src="https://i.imgur.com/jatUvVr.png" alt="스프링 오어스 인증 플로우"/>
</div>

위 사진에서는 스프링과 리소스 서버간의 통신은 생략되어있는데, 이는 Spring OAuth2 에서 리소스 서버로 요청을 보내고, 인증 토큰을 통해 사용자 정보를 받아오는 과정을 대신 처리해주기 때문이다. 따라서, 스프링 개발자는 단순히 `OAuth2UserService` 를 생성하여 리소스 서버로부터 응답된 사용자 정보를 Spring Security 에서 처리할 수 있도록 변환해주고 인증 요청이 성공하거나 실패할 경우 어떻게 처리할지 `Handler` 코드를 작성해주기만 하면 된다.

### 스프링 서버 설정

#### 관련 라이브러리 설치

```build.gradle
dependencies {
	implementation 'org.springframework.boot:spring-boot-starter-oauth2-client'  
	implementation 'org.springframework.boot:spring-boot-starter-security'
}
```

스프링부트에서는 OAuth2를 위한 라이브러리를 제공해준다. 위 2개 의존성을 추가해주면 스프링에서 소셜 로그인을 구현할 수 있는데 각각 OAuth2 인증 로직을 추가해주는 라이브러리와 이를 위해 필요한 Security 의존성이다.



#### Spring Security 설정

```java
@Bean  
public SecurityFilterChain filterChain(HttpSecurity security) throws Exception {  
    return security  
            ... 생략
            .oauth2Login(configurer -> configurer  
                    .authorizationEndpoint(authorization -> authorization.baseUri("/oauth2/authorization"))  
                    .redirectionEndpoint(redirection -> redirection.baseUri("/*/oauth2/code/*"))  
                    .userInfoEndpoint(endPoint -> endPoint.userService(oAuth2UserService))  
                    .successHandler(successHandler)  
            )  
            .build();  
}
```

Spring Security에 OAuth 관련 설정은 위 코드와 같이 작성해주면 된다. 각각의 속성을 확인해보면 다음과 같다.

- authorizationEndpoint: 사용자가 소셜 로그인 요청을 보낼 엔드포인트를 정의 해준다. 위 코드와 같이 작성하게 된다면 아래와 같은 엔드 포인트가 생성된다. 
	- 구글: {기본 URL}/oauth2/authorization/google
	- 카카오톡: {기본 URL}/oauth2/authorization/kakao
- redirectionEndpoint: 만약, 사용자가 로그인에 성공하게 된다면 리소스 서버에서 스프링 서버로 인증 코드를 담아 리다이렉트를 시키는데, 이때 리다이렉트를 어디로 시킬 건지 작성해주면 된다. 여기에 작성한 엔드 포인트는 리소스 서버에 Redirect URI 과 **무조건** 동일해야된다.
- userInfoEndpoint: 리소스 서버로부터 받아온 데이터를 처리해주는 서비스를 작성해주면 된다.
- successHandler: 소셜 로그인 인증 과정이 모두 성공적으로 이루어졌다면 실행되는 핸들러를 작성해주면 된다.

#### properties 설정

```application-oauth.properties
# GITHUB  
spring.security.oauth2.client.registration.github.client-id=[발급한 ID]
spring.security.oauth2.client.registration.github.client-secret=[발급한 비밀키]
spring.security.oauth2.client.registration.github.scope=profile, email  
# GOOGLE  
spring.security.oauth2.client.registration.google.client-id=[발급한 ID]
spring.security.oauth2.client.registration.google.client-secret=[발급한 비밀키]
spring.security.oauth2.client.registration.google.scope=profile,email  
# KAKAO  
spring.security.oauth2.client.registration.kakao.client-id=[발급한 ID]
spring.security.oauth2.client.registration.kakao.client-secret=[발급한 비밀키]
spring.security.oauth2.client.registration.kakao.authorization-grant-type=authorization_code  
spring.security.oauth2.client.registration.kakao.client-authentication-method=client_secret_post  
spring.security.oauth2.client.provider.kakao.authorization-uri=https://kauth.kakao.com/oauth/authorize  
spring.security.oauth2.client.provider.kakao.token-uri=https://kauth.kakao.com/oauth/token  
spring.security.oauth2.client.registration.kakao.redirect-uri=http://localhost:8080/login/oauth2/code/kakao  
spring.security.oauth2.client.provider.kakao.user-info-uri=https://kapi.kakao.com/v2/user/me  
spring.security.oauth2.client.provider.kakao.user-name-attribute=id  
# NAVER  
spring.security.oauth2.client.registration.naver.client-id=[발급한 ID]
spring.security.oauth2.client.registration.naver.client-secret=[발급한 비밀키]
spring.security.oauth2.client.registration.naver.authorization-grant-type=authorization_code  
spring.security.oauth2.client.registration.naver.client-authentication-method=client_secret_post  
spring.security.oauth2.client.provider.naver.authorization-uri=https://nid.naver.com/oauth2.0/authorize  
spring.security.oauth2.client.provider.naver.token-uri=https://nid.naver.com/oauth2.0/token  
spring.security.oauth2.client.registration.naver.redirect-uri=http://localhost:8080/login/oauth2/code/naver
spring.security.oauth2.client.provider.naver.user-info-uri=https://openapi.naver.com/v1/nid/me  
spring.security.oauth2.client.provider.naver.user-name-attribute=response
```

스프링 OAuth2 에서 사용할 설정 값들을 모두 `properties` 파일에 선언해주면 된다. 이때, 네이버와 카카오는 정식 지원을 하지 않기 때문에 직접 요청을 보낼 리소스 서버에 대한 정보를 모두 정의해주어야 한다.

### 서비스 로직

#### OAuth2UserService

```java
@Slf4j  
@RequiredArgsConstructor  
@Service  
public class CustomOAuth2UserService implements OAuth2UserService<OAuth2UserRequest, OAuth2User> {  
    private final UserMapper userMapper;  
  
    @Override  
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException { 
        DefaultOAuth2UserService userService = new DefaultOAuth2UserService();  
        OAuth2User user = userService.loadUser(userRequest);  
		  
        ProviderType provider = ProviderType.valueOf(userRequest.getClientRegistration().getRegistrationId().toUpperCase());  
        OAuth2Attribute attribute = OAuth2AttributeFactory.parseAttribute(provider, user.getAttributes());  
        log.debug("OAUTH2 기반의 로그인 요청 -> provider: {}, user: {}", provider, user);  
		  
        // * 해당 요청은 OAuth2 기반의 요청이기에 일치하는 사용자가 없다면 새로운 사용자를 생성한다.  
        User findUser = userMapper.findByUsername(user.getAttribute("email")).orElseGet(() -> {  
            User createUser = User.createOAuthUser(attribute, provider);  
            userMapper.save(createUser);  
            return createUser;  
        });  
		  
        return new UserPrincipal(findUser, user.getAttributes());  
    }  
}
```

위 코드는 사용자가 로그인 버튼을 클릭한 이후, 실제 리소스 서버에 요청을 보내 결과를 얻게 된다면 실행되는 서비스 코드이다. 
만약, 구글 로그인을 실행 했다면, 구글에 저장된 사용자의 정보를 `userRequest` 라는 파라미터에 받아오고, 이를 사용하여 자체적인 스프링 서버 내 유저로 변환해주면 된다. 코드를 한줄 한줄 확인해보면 다음과 같다.

```java
DefaultOAuth2UserService userService = new DefaultOAuth2UserService();  
OAuth2User user = userService.loadUser(userRequest);  
```

`userRequest` 에는 실제로 리소스 서버에서 받아온 응답 객체가 담겨있다. 따라서, 이를 쉽게 처리할 수 있도록 `OAuth2User` 객체로 변환해주는 작업이 필요하다. 해당 객체에는 리소스 서버에서 제공하는 유저 아이디, 이메일, 프로필 이미지 등이 담겨있는데 이를 사용해서 서버에 유저를 생성해주거나 가져오면 된다.

```java
ProviderType provider = ProviderType.valueOf(userRequest.getClientRegistration().getRegistrationId().toUpperCase());  
OAuth2Attribute attribute = OAuth2AttributeFactory.parseAttribute(provider, user.getAttributes());  
```

만약, 오직 하나의 리소스 서버만 사용한다면 해당 코드를 사용할 필요가 없다. 하지만, 지금처럼 구글, 카카오, 깃허브, 네이버 등등 다양한 리소스 서버를 사용한다면 리소스 서버에서 제공하는 사용자 정보 데이터가 각각 다를 것이다. 구글에서는 `id` 값을 `sub` 라는 값으로 반환해주지만, 카카오톡 에서는 `id` 라는 값에 담아준다. 따라서, 스프링 서버에서 필요한 값들을 리소스 서버 별로 파싱 해줄 수 있도록 만들어준다.

```java
User findUser = userMapper.findByUsername(user.getAttribute("email")).orElseGet(() -> {  
	User createUser = User.createOAuthUser(attribute, provider);  
	userMapper.save(createUser);  
	return createUser;  
});  
```

변환된 응답값을 기준으로 데이터베이스에 해당 값이 존재하는지 확인하고, 존재한다면 해당 유저를 반환해주고, 존재하지 않다면 새롭게 유저를 생성해주면 된다.

결과적으로, 유저가 로그인한 리소스 서버의 정보를 기반으로 데이터 베이스에서 유저 정보를 조회하고, 실제 데이터 베이스에 존재하는 유저 정보를 기반으로 스프링 서버에서 사용하는 인증 유저 객체를 생성해주면 된다.

#### SuccessHandler

```java
@Slf4j  
@RequiredArgsConstructor  
@Component  
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {  
    @Override  
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {  
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
          
        // TODO: principal 을 이용하여 accessToken 과 refreshToken 을 발급받아야 한다.  
        String redirectUrl = UriComponentsBuilder.fromUriString("http://localhost:3000")  
                .queryParam("access_token", "")  
                .queryParam("refresh_token", "")  
                .toUriString();  
  
        Cookie cookie = createCookie("refreshToken");  
        response.addCookie(cookie);  
  
        getRedirectStrategy().sendRedirect(request, response, redirectUrl);  
        super.onAuthenticationSuccess(request, response, authentication);  
    }  
  
    private Cookie createCookie(String refreshToken) {  
        Cookie refreshTokenCookie = new Cookie("refreshToken", refreshToken);  
        refreshTokenCookie.setHttpOnly(true);  
        refreshTokenCookie.setMaxAge(100000);  
        refreshTokenCookie.setPath("/");  
        return refreshTokenCookie;  
    }  
}
```

`SuccessHandler` 는 위에서 작성한 `OAuth2UserService` 가 정상적으로 처리 되었다면 실행되는 핸들러로 `Authentication` 객체에 위에서 생성한 `UserPrincipal` 객체가 담겨있다. 따라서, 로그인에 성공한 유저의 정보를 손쉽게 가져올 수 있다.

만약, 스프링을 풀스택으로 사용한다면 유저 정보를 담아 단순히 리다이렉트 시켜주면 되지만, 오로지 백엔드 서버로 사용하고 있다면, 위 코드와 같이 새롭게 JWT 토큰을 생성하여 이를 프론트엔드 서버로 리다이렉트 시켜주면 정상적으로 처리된다. 이때, 토큰 정보는 쿼리 파라미터로 첨부하여 인증 정보를 프론트엔드가 처리할 수 있도록 해야한다.

### Attribute 설정

위에서 설명했던 것 처럼 여러 리소스 서버를 사용하게 된다면 리소스 서버에서 응답한 값들을 하나의 형식으로 사용할 수 있도록 설계해주어야 한다. 따라서, 스프링 서버에서 사용하는 값들을 추상 클래스로 설계하고, 리소스 서버 응답을 새롭게 생성한 추상 클래스로 변환해주는 팩토리 패턴을 사용해주면 된다.

#### OAuth2Attribute

```java
@RequiredArgsConstructor  
@Getter  
public abstract class OAuth2Attribute {  
    private final Map<String, Object> attributes;  
    public abstract String getId();  
    public abstract String getName();  
    public abstract String getEmail();
    public abstract String getImageUrl();  
}
```

리소스 서버에서 제공한 응답을 담을 `attributes`  변수를 선언해주고, 자체 서버에서는 사용자 정보 중 닉네임과 이메일, 프로필 이미지만을 사용하기에 이를 가져올 수 있는 메서드를 만들어준다.

#### OAuth2AttributeFactory

```java
public class OAuth2AttributeFactory {  
    public static OAuth2Attribute parseAttribute(ProviderType provider, Map<String, Object> attributes) {  
        return switch (provider) {  
            case GOOGLE -> new GoogleAttribute(attributes);  
            case GITHUB -> new GithubAttribute(attributes);  
            case KAKAO -> new KakaoAttribute(attributes);  
            case NAVER -> new NaverAttribute(attributes);  
            default -> throw new RuntimeException("지원하지 않는 소셜 로그인입니다.");  
        };  
    }  
}
```

사용자가 선택한 리소스 서버를 입력 받아 이에 알맞는 리소스 별 `Attribute` 를 반환해준다.

#### GoogleAttribute

```java
public class GoogleAttribute extends OAuth2Attribute {  
    public GoogleAttribute(Map<String, Object> attributes) {  
        super(attributes);  
    }  
  
    @Override  
    public String getId() {  
        return super.getAttributes().get("sub").toString();  
    }  
  
    @Override  
    public String getName() {  
        return super.getAttributes().get("name").toString();  
    }  
  
    @Override  
    public String getEmail() {  
        String email = super.getAttributes().get("email").toString();  
        if (!StringUtils.hasText(email)) {  
            return this.getName() + "@gmail.com";  
        }  
        return email;  
    }  
  
    @Override  
    public String getImageUrl() {  
        return super.getAttributes().get("picture").toString();  
    }  
}
```

리소스 서버에서 제공한 `attributes` 에서 각 메서드에 알맞는 값들을 가져올 수 있도록 코드를 작성해주면 된다.

---
## 참고 자료

[OAuth2.0 개념 및 연동](https://guide.ncloud-docs.com/docs/b2bpls-oauth2)  
[OAuth란? / OAuth 2.0 인증 과정 예시](https://ksh-coding.tistory.com/62)  
[OAuth2 소셜 로그인 가이드 (구글, 페이스북, 네이버, 카카오)](https://deeplify.dev/back-end/spring/oauth2-social-login)  
