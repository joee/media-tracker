{ pkgs ? import <nixpkgs> {} }:

# This is equivalent to shell.nix - use either one
import ./shell.nix { inherit pkgs; }
