# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Mensagens e lembretes

As telas de mensagens usam a API Spring Boot do backend. Inicie o backend na
pasta `backend/esteticaFernandaLima` com `.\mvnw.cmd spring-boot:run` e depois
inicie o Expo:

```bash
npx expo start
```

O endereço da API vem de `EXPO_PUBLIC_API_URL` no `.env` (copie o `env.example`):
`http://localhost:8080` na web, ou o IP da máquina no celular/emulador.

As rotas integradas são `/lembretes`, `/lembrete-horario` e
`/lembrete-retorno`. Ao tocar em um cliente, o app pede ao backend a mensagem
gerada pela IA (`POST /lembretes/{id}/gerar`); o texto pode ser editado ou
gerado de novo. Em "Enviar mensagem", o app registra o envio com o texto
revisado (`POST /lembretes/{id}/enviar`) e abre o `whatsappUrl` devolvido: o
WhatsApp abre na conversa do cliente com a mensagem digitada, e o envio final
é feito manualmente.

As chamadas ficam em `src/services/lembretesApi.js` e usam o cliente `api`
(axios) de `src/services/api.ts`, que já envia o token JWT do login do app.
Configure `EXPO_PUBLIC_API_URL` no `.env` (veja o `env.example`).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
