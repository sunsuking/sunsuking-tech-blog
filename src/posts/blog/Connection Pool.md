---
title: Connection Pool
category:
  - Spring
desc: 스프링에서 데이터베이스 커넥션을 관리하는 방법
thumbnail: ./images/default.jpg
alt:
createdAt: 2024-03-12 12:25
updatedAt: 2024-03-18 17:59
tags:
  - Posting
  - Spring
  - Hikari
  - JPA
isFinished: true
---

## Java에서 데이터베이스 연결

만약, Spring 없이 자바에서 데이터 베이스를 연결하기 위해서는 JDBC를 사용해야 한다. JDBC를 사용할 때 다음과 같이 `JDBC 연결 클래스` 를 생성하여 싱글톤 패턴으로 사용하는데, 이는 매번 단순 반복하며 연결을 생성해주고, 끊어주는 코드를 줄이고자 하는 것도 있지만, 메모리 낭비를 줄이기 위해서가 크다.

```java
public class CustomConnection {
	private final String driverName = "com.mysql.cj.jdbc.Driver";
	private final String url = "jdbc:mysql://localhost:3306/db?serverTimezone=UTC";
	private final String user = "user";
	private final String password = "password";
	private static CustomConnection instance = new CustomConnection();
	private static Connection conn;

	private CustomConnection() {
		try {
			Class.forName(driverName);
		} catch (ClassNotFoundException e) {
			e.printStackTrace();
		}
	}

	public static Connection getConnection() throws SQLException {
		if (conn == null) {
			conn = DriverManager.getConnection(url, user, password);
		}
		return conn;
	}
```

그렇다면, 위와 같이 싱글톤 패턴을 사용하여 데이터 베이스를 연결하게 된다면 오로지 하나의 커넥션만 생성하기에 데이터베이스의 부하를 줄일 수 있는데, 실제로 데이터 베이스에서 연결을 조회해보면 다음과 같다.

```java
public static void main(String[] args) throws SQLException {
	for (int i = 0; i < 100; i++) {
		System.out.println(CustomConnection.getConnection());
	}
	while(true) {} // 커넥션 유지를 위한 반복문
}
```

#### 최초 데이터 베이스 연결 상태

![최초 데이터 베이스 연결 상태](../images/before_db_connection.png)  

#### 싱글톤 패턴을 사용한 데이터 베이스 연결 상태

![싱글톤 패턴을 사용한 데이터 베이스 연결 상태](../images/after_db_connection.png)  

#### 싱글톤 패턴을 사용하지 않은 데이터 베이스 연결 상태

![싱글톤 패턴을 사용하지 않은 데이터 베이스 연결 상태](../images/after_db_connection_not_sigleton.png)  

싱글톤 패턴을 사용하지 않는다면 커넥션을 생성할 때 마다 데이터 베이스에 커넥션이 추가되는 것을 확인할 수 있으며, 쓰레드가 예측 불가하게 생성되는 것도 확인할 수 있다. 하지만, 싱글톤 패턴을 사용하여 커넥션을 생성한다면, 쓰레드와 커넥션 모두 ==오로지 하나==만 생성된 것을 볼 수 있다.

## 스프링에서 데이터베이스 연결

그렇다면, 실제 스프링에서는 어떤 방식으로 데이터 베이스와 연결하고, 어떻게 관리하는지 알아보자. 일단, 기존 스프링 부트 2.0 이전에는 `tomcat-jdbc`를 사용하였지만, 2.0 버전 이후부터 `Hikari CP`를 사용해 데이터 베이스를 연결하고 있다.

`Hikari CP` 어디서 들어본 적인 있다면 아마 스프링 시작한 이후 로그에서 봤던 것 일거다.

> 사진 추가 예정

기존의 JDBC는 아래와 같은 방식으로 데이터베이스와 연결하였다. 사용자가 데이터를 요청한 경우 위에서 설명한 것 처럼 JDBC Driver를 로드하고 커넥션 객체를 생성 및 종료를 한다는 단점이 존재한다. 이를 싱글톤으로 해결할 수 있지만, 여러 요청이 동시에 들어오게 된다면 오로지 하나의 연결만으로 사용자의 연결을 감당하는 것은 불가능 할 것이다.

![기존 JDBC 연결 방식](../images/jdbc_connection_layer.png)  


그래서, `Hikari CP`는 DBCP 연결 방식을 사용한다. DBCP(DataBase Connection Pool) 방식은 말 그대로 미리 데이터베이스 연결을 만들어두는 방식이다. 스프링 서버가 실행될 때 Pool에 미리 여러 개의 `Connection`을 만들어두고, 사용자가 요청이 들어올 때마다 만들어둔 Pool에서 `Connection`들을 가져와 사용하고 사용이 완료되면 다시 Pool에 반환하는 방식으로 사용된다.

![연결 방식](../images/dbcp_connection_layer.png)  

#### Hikari CP Benchmark 이미지

![벤치마크 결과](../images/hikaricp_benchmark.png)  
실제로, 벤치마크를 확인해보면 다른 방식(JDBC)에 비해 월등한 속도를 보이는 것을 알 수 있다.

스프링에서는 `Hikari CP`를 기본적으로 사용하기에 우리는 환경 설정 파일을 수정하면서 연결과 관련된 설정을 변경할 수 있다.

```properties
spring.datasource.hikari.maximum-pool-size: 10       // 최대 생성할 Pool 개수
spring.datasource.hikari.connection-timeout: 5000    // 연결을 기다릴 시간
spring.datasource.hikari.max-lifetime: 1800000       // Pool에 존재하는 연결의 수명
spring.datasource.hikari.auto-commit: false          // 커넥션들의 자동 커밋 여부
```

### 추후 정리

$$
pool size = T^n(C_m - 1) + 2
$$

---

## 참고 자료

[Spring-DB커넥션풀과-Hikari-CP-알아보기](https://velog.io/@miot2j/Spring-DB%EC%BB%A4%EB%84%A5%EC%85%98%ED%92%80%EA%B3%BC-Hikari-CP-%EC%95%8C%EC%95%84%EB%B3%B4%EA%B8%B0)
[HikariCP Dead lock에서 벗어나기 (이론편)](https://techblog.woowahan.com/2664/)
[HikariCP Dead lock에서 벗어나기 (실전편)](https://techblog.woowahan.com/2663/)
[HikariCP 이해하고 적용하기 (with. MyBatis)](https://adjh54.tistory.com/73)'
[Spring Boot Hikari Connection Pool 에러 핸들링](https://jgrammer.tistory.com/entry/Spring-Boot-Hikari-Connection-Pool-%EC%97%90%EB%9F%AC-%ED%95%B8%EB%93%A4%EB%A7%81)
