{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs_20
    nodePackages.npm
  ];

  shellHook = ''
    echo "🚀 Kids Media Tracker - Development Environment"
    echo "Node version: $(node --version)"
    echo "npm version: $(npm --version)"
    echo ""
    echo "Available commands:"
    echo "  npm install  - Install dependencies"
    echo "  npm run dev  - Start development server"
    echo "  npm run build - Build for production"
    echo ""

    # Add node_modules/.bin to PATH so npx and local binaries work
    export PATH="$PWD/node_modules/.bin:$PATH"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
      echo "⚠️  node_modules not found. Run 'npm install' first."
      echo ""
    fi
  '';
}
