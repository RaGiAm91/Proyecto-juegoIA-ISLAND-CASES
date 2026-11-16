module.exports = {
  forbidden: [
    {
      name: "client-cannot-import-server",
      severity: "error",
      from: { path: "^client/src" },
      to: { path: "^server/src" },
    },
    {
      name: "server-cannot-import-client",
      severity: "error",
      from: { path: "^server/src" },
      to: { path: "^client/src" },
    },
    {
      name: "shared-cannot-import-app-code",
      severity: "error",
      from: { path: "^shared/src" },
      to: { path: "^(client|server)/src" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
  },
};
