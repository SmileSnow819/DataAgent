// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["vuetify-nuxt-module"],
  //基于组件名称自动导入
  components: [
    {
      path: "~/components",
      pathPrefix: false,
    },
  ],
  //全局关闭ssr
  ssr: false,
  // /路由重定向到/create-agent
  routeRules: {
    "/": { redirect: "/agent/new" },
    // 代理所有 /api/** 的请求到 Java 后端
    "/api/**": { proxy: "http://localhost:8065/api/**" },
    "/nl2sql/**": { proxy: "http://localhost:8065/nl2sql/**" },
  },
});
