# RideFriend

RideFriend é uma aplicação de ride-sharing desenvolvida com React Native, Expo e Supabase.

## 📋 Pré-requisitos

- Node.js 18+
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (macOS) ou Android Emulator
- Conta Supabase (https://supabase.com)

## 🚀 Quick Start

### 1. Inicializar o projeto com Expo

```bash
npx create-expo-app@latest ridefriend --template blank-typescript
```

### 2. Instalar dependências

```bash
cd ridefriend
npm install
```

ou

```bash
yarn install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` e adicione suas chaves Supabase:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` (opcional)

### 4. Iniciar a aplicação

```bash
npm start
```

Escolha a plataforma desejada:
- **iOS**: Pressione `i`
- **Android**: Pressione `a`
- **Web**: Pressione `w`

## 📁 Estrutura do Projeto

```
ridefriend/
├── src/
│   ├── components/       # Componentes reutilizáveis
│   ├── constants/        # Constantes (tema, configurações)
│   ├── hooks/           # Custom hooks
│   ├── navigation/      # Configuração de navegação
│   ├── services/        # Serviços (Supabase, APIs)
│   ├── store/           # Zustand stores (estado global)
│   ├── types/           # TypeScript interfaces
│   └── utils/           # Funções utilitárias
├── assets/              # Imagens e ícones
├── app.json             # Configuração Expo
├── tsconfig.json        # Configuração TypeScript
└── package.json         # Dependências
```

## 🎨 Design System

### Cores
- **Navy**: #0D1F38 (primária)
- **Amber**: #D97706 (acento)
- **Green**: #10B981 (sucesso)
- **Red**: #EF4444 (erro)
- **Surface**: #F2F5FB (fundo)

### Tipografia
- xs: 11px | sm: 13px | md: 15px | lg: 17px | xl: 20px | xxl: 24px | xxxl: 30px

### Espaçamento
- xs: 4px | sm: 8px | md: 12px | lg: 16px | xl: 24px | xxl: 32px

### Raios de Borda
- sm: 8px | md: 14px | lg: 20px | xl: 28px | full: 999px

## 📦 Principais Dependências

- **React Native 0.74**: Framework mobile
- **Expo 51**: Plataforma de desenvolvimento
- **TypeScript**: Type safety
- **React Navigation**: Navegação
- **Zustand**: State management
- **Supabase**: Backend & autenticação
- **React Native Maps**: Mapas
- **Expo Location**: Serviços de localização
- **React Query**: Gerenciamento de cache
- **MMKV**: Storage eficiente

## 🔐 Autenticação

A autenticação é feita via SMS com Supabase:
1. Usuário insere número de telefone
2. Recebe código OTP por SMS
3. Verifica o código
4. Acesso liberado

## 🗺️ Navegação

### Auth Stack
- **PhoneInput**: Entrada de telefone
- **OTPVerify**: Verificação de OTP
- **Onboarding**: Onboarding inicial

### Main Tabs
- **Home (Início)**: Tela inicial
- **Map (Mapa)**: Mapa com drivers/passageiros
- **Network (Rede)**: Contatos e rede
- **Profile (Perfil)**: Perfil do utilizador

## 📝 Scripts

```bash
# Iniciar o app
npm start

# Testes
npm test

# Lint
npm run lint

# Type check
npm run type-check

# Build Android
npm run android

# Build iOS
npm run ios
```

## 🔧 Configuração Supabase

1. Criar conta em https://supabase.com
2. Criar novo projeto
3. Executar migrações SQL (disponíveis em `/migrations`)
4. Copiar URL e ANON KEY para `.env.local`

## 📱 Permissões Necessárias

### iOS
- Localização
- Câmara
- Biblioteca de fotos

### Android
- ACCESS_FINE_LOCATION
- ACCESS_COARSE_LOCATION
- CAMERA
- READ_EXTERNAL_STORAGE
- WRITE_EXTERNAL_STORAGE

## 🐛 Troubleshooting

### Clear cache
```bash
npm start -- --clear
```

### Reinstall dependencies
```bash
rm -rf node_modules
npm install
```

### Reset Expo cache
```bash
expo start -c
```

## 📄 Licença

Este projeto está sob a licença MIT.

## 👥 Contribuições

Contribuições são bem-vindas! Por favor, crie uma issue ou pull request.

## 📧 Suporte

Para suporte, contacte: support@ridefriend.com
