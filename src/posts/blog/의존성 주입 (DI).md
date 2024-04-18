---
title: 의존성 주입 (DI)
category:
  - Spring
desc: 스프링에서 사용하는 의존성 주입에 대하여
thumbnail: ./images/default.jpg
alt: 의존성 주입
createdAt: 2024-04-17 11:17
updatedAt: 2024-04-18 10:20
tags:
  - Posting
  - Spring
  - DI
  - IoC
isFinished: true
---
## 의존성 주입 (Dependency Injection)이란?

의존성이란 특정한 객체에서 어떤 로직을 처리하기 위해 다른 객체의 값, 혹은 메서드를 사용하기 위해 다른 객체를 참조하는 것을 의미한다. 의존성 주입은 스프링 내부에 존재하는 객체들 간의 의존 관계를 외부(스프링 컨테이너)에서 생성 후 자동으로 주입해주는 것을 의미한다. 

## 의존성 주입이 필요한 이유

만약, 아래와 같은 코드가 있다고 가정해보자.

```java
public class CoffeeShop {
	private Coffee coffee;
	public CoffeeShop() {
		this.coffee = new IceAmericano();
	}
}
```

만약, 위 코드에서 커피에 아이스 아메리카노가 아닌 뜨거운 아메리카노를 넣고 싶다면 `CoffeeShop` 객체의 생성자 코드를 직접 수정해주어야 한다. 또한, 만약 아이스 아메리카노가 메뉴에서 사라진다면 `CoffeeShop` 객체의 코드를 전부 다 바꿔주어야 한다. 이렇게, 하나의 객체가 다른 객체에 의존한다면 코드 변경에 어려움이 존재할 뿐 아니라, 코드를 테스트하기도 어려워진다. 의존성 주입은 이런 문제를 해결하기 위해 필요하다.

```java
public class CoffeeShop {
	private Coffee coffee;
	public CoffeeShop(Coffee coffee) {
		this.coffee = coffee;
	}
	// new CoffeeShop(new IceAmericano());
}
```

만약, 코드를 다음과 같이 수정하고 `new CoffeeShop(new IceAmericano())` 다음과 같은 코드를 스프링에서 관리해준다면 개발자는 객체 간 의존성에 고민하지 않아도 될 뿐 아니라, 객체 간의 결합도 결합도가 낮아지고 유연성이 높아질 것이다. 

## 의존성 주입 방법

#### 필드 주입 (Field Injection)

말 그대로 선언된 필드에 객체를 넣어주는 방식이다. 이때, `@AutoWired` 라는 어노테이션을 사용하여 의존성을 넣어주는데 아래와 같이 사용한다면 스프링 컨테이너에 존재하는 `Bean` 객체를 받아올 수 있다.

```java
public class CoffeeShop {
	@Autowired
	private Coffee coffee;
}
```

필드 주입을 사용한다면 편하게 의존성을 주입할 수 있다는 장점이 존재하지만, 생성자 이후 호출이 되기에 `final` 키워드를 사용하지 못하여 객체가 변경될 수 있다는 점과 A라는 객체가 B를, B라는 객체가 A를 참조하는 순환 참조가 발생할 수 있다는 단점이 존재한다.

#### 수정자 주입 (Setter Injection)

객체에 `setter()` 메서드를 정의하여 의존성을 주입하는 방식이다. 역시, `@Autowired` 라는 어노테이션을 사용하여 의존성을 주입하며, 스프링 컨테이너에서 모든 `Bean` 객체를 생성 이후 의존성을 주입해주는 방식이다.

```java
public class CoffeeShop {
	private Coffee coffee;
	
	@Autowired
	private void setCoffee(Coffee coffee) {
		this.coffee = coffee;
	}
}
```

수정자 주입을 사용하게 된다면 필드 주입과 다르게 의존성이 주입된 이후에도 의존성이 수정이 가능하다는 장점이 있지만, 런타임 상황에서 NPE가 발생할 수 있으며, 수정이 가능하다는 부분이 오히려 단점으로 작용할 가능성이 높다. (안정성 때문에)

#### 생성자 주입 (Construct Injection)

객체가 생성될 때 호출되는 생성자에서 의존성을 주입하는 방식이다. 생성자에서 의존성을 주입하기에 다른 방식과 달리 `final` 키워드가 사용 가능하고, 그로 인해 불변성이 보장된다.

```java
public class CoffeeShop {
	private final Coffee coffee;
	
	public CoffeeShop(Coffee coffee) {
		this.coffee = coffee;	
	}
}
```

위 코드와 같이 사용할 수 있으며, 롬복 라이브러리를 사용한다면 `@RequiredArgsConstructor` 어노테이션을 사용하여 더욱 간결한 코드 작성이 가능하다. Spring 4.3 버전부터 생성자 주입 방식의 의존성 주입을 권장하고 있다.

## 왜 생성자 주입을 권장할까?

Spring에서 생성자 주입 방식을 권장하는 이유는 다음과 같다.

#### 객체의 불변성

일반적으로 하나의 객체에서 참조하는 의존성은 애플리케이션이 종료되기 전까지 수정될 일이 없다. 하지만, 수정자 주입 방식을 사용하게 된다면 서비스 도중에 의존성이 변경될 수 있을 것이고, 그로 인한 문제가 발생할 수 있다. 하지만, 생성자 주입을 사용하게 된다면 `final` 키워드를 사용하여 수정 자체를 막아버릴 수 있으며, 그렇지 않더라도 생성자 호출 시에만 의존성이 주입되기에 런타임 상황에서 의존성이 수정되는 문제를 막을 수 있다.

#### 테스트 용이

필드 주입 방식으로 의존성을 주입하게 된다면 의존성이 스프링 DI에 의존하게 되어 순수 자바 코드 기반의 단위 테스트를 실행하기 어렵다. 하지만, 생성자 주입 방식을 사용하게 된다면 단위 테스트를 진행할 때 직접 생성자에 의존성을 주입해주면 되기에 더욱 용이하게 테스트할 수 있다.

### 순환 참조 방지

순환 참조란 서로 다른 객체가 다른 객체를 의존하는 것을 의미한다. A 객체가 B를, B 객체가 A를 의존하게 된다면 서로의 의존성을 주입하기 위해 무한 반복에 빠지게 될 것이다. 필드 주입, 수정자 주입의 경우 이런 순환 참조 문제가 런타임 시에 발생할 수 있다는 문제가 존재한다. 서비스 진행 중에 예측이 되지 않은 에러가 발생하는 것은 치명적인 문제가 된다. 하지만, 생성자 주입을 사용하게 된다면 순환 참조를 컴파일 타임에서 확인이 가능하기에 서비스 진행 전 미리 방지할 수 있다는 장점이 존재한다.

---
## 참고 자료
[Spring 의존성 주입DI에 대하여](https://velog.io/@think2wice/Spring-%EC%9D%98%EC%A1%B4%EC%84%B1-%EC%A3%BC%EC%9E%85DI%EC%97%90-%EB%8C%80%ED%95%98%EC%97%AC)  
[Spring DIDependency Injection](https://velog.io/@gillog/Spring-DIDependency-Injection)  
[Spring을 왜 사용하나요?(DI)](https://galid1.tistory.com/493?category=769011)  
[Spring DI(Dependency Injection) - 의존 관계 주입 핵심 정리](https://backendcode.tistory.com/249)  
[의존성 주입(Dependency Injection, DI)이란? 및 Spring이 의존성 주입을 지원하는 이유](https://mangkyu.tistory.com/150)  
[의존성 주입(DI), 개념, 방법, 장단점, 생성자 주입을 사용하자!](https://engineerinsight.tistory.com/46)  

