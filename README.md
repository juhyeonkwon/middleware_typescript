# middleware_typescript
기존 Middleware를 typescript로 재작성하는 저장소입니다.

https://blog.naver.com/asshole96/222649317856



# 실행

1. 모듈 설치
```
npm install
```

2. 스웨거 yaml 파일 bundling 

```
swagger-cli bundle ./src/swagger/swagger.yaml --outfile ./build.yaml --type yaml
```

3. 실행

- 개발자 모드 : npm run dev
- 빌드 : tsc 또는 npm run build
- 실행 : npm run start 



# Tip
Swagger 는 localhost:3000/swagger 에서 확인가능
