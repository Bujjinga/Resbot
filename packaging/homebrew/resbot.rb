# Homebrew formula for RESBOT. Publish it in a tap repo (Bujjinga/homebrew-resbot):
#   brew tap bujjinga/resbot && brew install resbot
# Fill sha256 for each release:
#   curl -fsSL https://github.com/Bujjinga/Resbot/archive/refs/tags/v0.1.0.tar.gz | shasum -a 256
class Resbot < Formula
  desc "Agentic Kaggle research partner plugin and CLI for Claude Code"
  homepage "https://github.com/Bujjinga/Resbot"
  url "https://github.com/Bujjinga/Resbot/archive/refs/tags/v0.1.0.tar.gz"
  sha256 "REPLACE_WITH_SHA256_OF_RELEASE_TARBALL"
  license "MIT"

  depends_on "node"

  def install
    libexec.install Dir["*"], ".claude-plugin"
    bin.install_symlink libexec/"bin/resbot.js" => "resbot"
    bash_completion.install libexec/"completions/resbot.bash" => "resbot"
    zsh_completion.install libexec/"completions/_resbot"
  end

  def caveats
    <<~EOS
      Register the plugin with Claude Code (run again after `brew upgrade resbot`):
        resbot install
      Then check your setup:
        resbot doctor
    EOS
  end

  test do
    assert_equal version.to_s, shell_output("#{bin}/resbot version").strip
  end
end
