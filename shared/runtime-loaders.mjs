export async function loadDotnet() {
  const { dotnet } = await import('../regex/_framework/dotnet.js?v=topics-2');
  const { getAssemblyExports, getConfig } = await dotnet.create();
  return getAssemblyExports(getConfig().mainAssemblyName);
}

export async function loadPython() {
  const runtime = new URL('../regex/_python/314.0.8/', import.meta.url);
  const { loadPyodide } = await import(new URL('pyodide.mjs', runtime));
  return loadPyodide({ indexURL: runtime.href });
}
