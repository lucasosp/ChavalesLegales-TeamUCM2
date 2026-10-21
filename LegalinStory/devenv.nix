{ pkgs, ... }:

{
  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    pnpm.enable = true;
  };

  packages = with pkgs; [
    git
  ];

  # `devenv up` starts the Vite dev server with hot reload.
  processes.dev.exec = "pnpm dev --host 0.0.0.0";

  scripts = {
    dev.exec = "pnpm dev --host 0.0.0.0";
    build.exec = "pnpm build";
    preview.exec = "pnpm preview --host 0.0.0.0";
    test.exec = "pnpm test";
  };

  enterShell = ''
    echo "Node $(node --version) | pnpm $(pnpm --version)"
    echo "Run 'devenv up' (or 'dev') to start the dev server on http://localhost:5173"
  '';
}
