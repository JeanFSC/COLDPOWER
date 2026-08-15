export const coldPowerClerkAppearance = {
  options: {
    socialButtonsPlacement: "bottom",
  },
  variables: {
    colorPrimary: "#ff830e",
    colorText: "#102a43",
    colorTextSecondary: "#6b7c93",
    colorBackground: "#ffffff",
    borderRadius: "0.5rem",
    fontFamily: "inherit",
  },
  elements: {
    rootBox: "!w-full !max-w-full",
    cardBox: "!w-full !max-w-full !bg-transparent !shadow-none !rounded-none",
    card: "!w-full !max-w-none !bg-transparent !p-0 !shadow-none !rounded-none",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    main: "gap-4",
    socialButtonsBlockButton: "h-10 border-[#dfe6ed] bg-white text-[#102a43] hover:bg-[#f8fafc]",
    socialButtonsBlockButtonText: "text-xs font-extrabold",
    dividerLine: "bg-[#dfe6ed]",
    dividerText: "text-[11px] font-semibold text-[#8195aa]",
    formFieldLabel: "text-xs font-extrabold text-[#102a43]",
    formFieldInput:
      "h-11 border-[#dfe6ed] bg-white text-sm text-[#102a43] placeholder:text-[#9aacba] focus:border-[#2277ee] focus:ring-[#2277ee]/10",
    formFieldInputShowPasswordButton: "text-[#8195aa] hover:text-[#102a43]",
    formButtonPrimary: "h-11 bg-[#ff830e] text-sm font-extrabold shadow-none hover:bg-[#e97400]",
    footerAction: "pt-1 text-sm font-semibold text-[#6b7c93]",
    footerActionLink: "font-extrabold text-[#2277ee] hover:text-[#0b5fc4]",
    identityPreviewEditButton: "text-[#2277ee]",
  },
} as const;

export const coldPowerClerkLocalization = {
  locale: "es-PE",
  socialButtonsBlockButton: "Continuar con {{provider|titleize}}",
  dividerText: "o continúa con",
  formFieldLabel__emailAddress: "Correo electrónico",
  formFieldLabel__password: "Contraseña",
  formFieldLabel__firstName: "Nombre",
  formFieldLabel__lastName: "Apellido",
  formFieldInputPlaceholder__emailAddress: "ejemplo@empresa.com",
  formFieldInputPlaceholder__password: "Ingresa tu contraseña",
  formFieldInputPlaceholder__signUpPassword: "Crea tu contraseña",
  formFieldInputPlaceholder__firstName: "Ingresa tu nombre",
  formFieldInputPlaceholder__lastName: "Ingresa tu apellido",
  formFieldAction__forgotPassword: "¿Olvidaste tu contraseña?",
  formButtonPrimary: "Continuar",
  signIn: {
    start: {
      title: "Iniciar sesión",
      subtitle: "Ingresa para continuar",
      actionText: "¿Aún no tienes cuenta?",
      actionLink: "Crear cuenta",
    },
  },
  signUp: {
    start: {
      title: "Crear cuenta",
      subtitle: "Completa tus datos para continuar",
      actionText: "¿Ya tienes cuenta?",
      actionLink: "Iniciar sesión",
    },
    legalConsent: {
      checkbox: {
        label__termsOfServiceAndPrivacyPolicy:
          "Acepto los {{termsOfServiceLink}} y la {{privacyPolicyLink}}.",
      },
    },
  },
} as const;
