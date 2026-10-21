#!/bin/sh
# Gera as versões en/ e es/ a partir do index.html (português) com o _fonte/idiomas.mjs, e depois o
# assets/css/site.css a partir do _fonte/estilo.css e das classes usadas nas três páginas e no
# assets/js/site.js. Rodar de qualquer lugar:  sh sitevendas/_fonte/construir.sh
#
# Mudou um texto no index.html, o idiomas.mjs para e diz qual tradução falta: atualizar lá e rodar de novo.
#
# O Tailwind CSS 4.3.3 fica instalado numa pasta de trabalho fora do Drive ($TMPDIR): instalar aqui
# encheria o Drive com milhares de arquivos do node_modules. A conta é feita lá e só o site.css
# volta para esta pasta. Na primeira vez baixa o Tailwind (precisa de internet); depois reaproveita.
#
# No fim, carimba nas três páginas a versão do site.css e do site.js (?v=...). O .htaccess do site da
# Dunamis guarda CSS e JS no navegador por 1 mês; com o carimbo, quem já visitou baixa o arquivo novo
# assim que ele muda. Por isso: mudou o site.js ou o estilo, roda este script antes de subir.
set -e
AQUI="$(cd "$(dirname "$0")/.." && pwd)"
node "$AQUI/_fonte/idiomas.mjs"
OBRA="${TMPDIR:-/tmp}/sitevendas-tailwind-4.3.3"
mkdir -p "$OBRA"
if [ ! -x "$OBRA/node_modules/.bin/tailwindcss" ]; then
  (cd "$OBRA" && npm init -y >/dev/null && npm install --no-audit --no-fund --silent tailwindcss@4.3.3 @tailwindcss/cli@4.3.3)
fi
rm -rf "$OBRA/site" && mkdir -p "$OBRA/site/_fonte" "$OBRA/site/assets/js" "$OBRA/site/en" "$OBRA/site/es"
cp "$AQUI/index.html" "$OBRA/site/"
cp "$AQUI/en/index.html" "$OBRA/site/en/"
cp "$AQUI/es/index.html" "$OBRA/site/es/"
cp "$AQUI/_fonte/estilo.css" "$OBRA/site/_fonte/"
cp "$AQUI/assets/js/site.js" "$OBRA/site/assets/js/"
(cd "$OBRA/site" && "$OBRA/node_modules/.bin/tailwindcss" -i _fonte/estilo.css -o site.css --minify)
mkdir -p "$AQUI/assets/css"
cp "$OBRA/site/site.css" "$AQUI/assets/css/site.css"
echo "assets/css/site.css: $(wc -c < "$AQUI/assets/css/site.css" | tr -d ' ') bytes"

versao() { cksum < "$AQUI/$1" | cut -d ' ' -f 1; }
CSS="$(versao assets/css/site.css)"
JS="$(versao assets/js/site.js)"
for PAGINA in index.html en/index.html es/index.html; do
  sed -e "s|assets/css/site\.css?v=[0-9]*|assets/css/site.css?v=$CSS|" \
      -e "s|assets/js/site\.js?v=[0-9]*|assets/js/site.js?v=$JS|" "$AQUI/$PAGINA" > "$OBRA/carimbo.html"
  cp "$OBRA/carimbo.html" "$AQUI/$PAGINA"
done
echo "index.html, en/ e es/: site.css?v=$CSS · site.js?v=$JS"
