#!/bin/sh
# Gera o assets/css/site.css a partir do _fonte/estilo.css e das classes usadas no index.html e no
# assets/js/site.js. Rodar de qualquer lugar:  sh sitevendas/_fonte/construir.sh
#
# O Tailwind CSS 4.3.3 fica instalado numa pasta de trabalho fora do Drive ($TMPDIR): instalar aqui
# encheria o Drive com milhares de arquivos do node_modules. A conta é feita lá e só o site.css
# volta para esta pasta. Na primeira vez baixa o Tailwind (precisa de internet); depois reaproveita.
#
# No fim, carimba no index.html a versão do site.css e do site.js (?v=...). O .htaccess do site da
# Dunamis guarda CSS e JS no navegador por 1 mês; com o carimbo, quem já visitou baixa o arquivo novo
# assim que ele muda. Por isso: mudou o site.js ou o estilo, roda este script antes de subir.
set -e
AQUI="$(cd "$(dirname "$0")/.." && pwd)"
OBRA="${TMPDIR:-/tmp}/sitevendas-tailwind-4.3.3"
mkdir -p "$OBRA"
if [ ! -x "$OBRA/node_modules/.bin/tailwindcss" ]; then
  (cd "$OBRA" && npm init -y >/dev/null && npm install --no-audit --no-fund --silent tailwindcss@4.3.3 @tailwindcss/cli@4.3.3)
fi
rm -rf "$OBRA/site" && mkdir -p "$OBRA/site/_fonte" "$OBRA/site/assets/js"
cp "$AQUI/index.html" "$OBRA/site/"
cp "$AQUI/_fonte/estilo.css" "$OBRA/site/_fonte/"
cp "$AQUI/assets/js/site.js" "$OBRA/site/assets/js/"
(cd "$OBRA/site" && "$OBRA/node_modules/.bin/tailwindcss" -i _fonte/estilo.css -o site.css --minify)
mkdir -p "$AQUI/assets/css"
cp "$OBRA/site/site.css" "$AQUI/assets/css/site.css"
echo "assets/css/site.css: $(wc -c < "$AQUI/assets/css/site.css" | tr -d ' ') bytes"

versao() { cksum < "$AQUI/$1" | cut -d ' ' -f 1; }
CSS="$(versao assets/css/site.css)"
JS="$(versao assets/js/site.js)"
sed -e "s|assets/css/site\.css?v=[0-9]*|assets/css/site.css?v=$CSS|" \
    -e "s|assets/js/site\.js?v=[0-9]*|assets/js/site.js?v=$JS|" "$AQUI/index.html" > "$OBRA/index.html"
cp "$OBRA/index.html" "$AQUI/index.html"
echo "index.html: site.css?v=$CSS · site.js?v=$JS"
