# discordcat-to-node.js

[discordcat](https://github.com/k-nasa/discordcat) を Node.js 18 で動くように移植したものです。

## 使い方

CLI で指定

```
# メッセージを投稿
echo "hello" | node --experimental-modules ./index.js --user="Bot" --channel="isucon-notif" --webhook_url="https://example.com"

# ファイルを投稿
node --experimental-modules ./index.js --user="Bot" --channel="isucon-notif" --webhook_url="https://example.com" --file="your_file.ext"
```

一部設定は `.discordcat` でも可

```
# .discordcat
default_channel = "isucon-notif"
[channels]
general = "WEBHOOK_URL"
```
