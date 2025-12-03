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

    # Add node_modules/.bin to PATH so local binaries work
    export PATH="$PWD/node_modules/.bin:$PATH"

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
      echo "⚠️  Dependencies not installed."
      echo "Run: npm install"
      echo ""
    else
      echo "✅ Dependencies installed"
      echo ""
      echo "Available commands:"
      echo "  npm run dev    - Start development server (http://localhost:3000)"
      echo "  npm run build  - Build for production"
      echo "  vite           - Run vite directly (now in PATH)"
      echo ""

      # Verify vite is accessible
      if command -v vite &> /dev/null; then
        echo "✅ vite is available in PATH"
      else
        echo "⚠️  vite not found. Try running 'npm install' again."
      fi
      echo ""
    fi
  '';
}
