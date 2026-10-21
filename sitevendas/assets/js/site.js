/* Página de vendas da PageLinks: o comportamento, com o Alpine.js (assets/js/alpine.min.js).
   Este arquivo carrega antes do Alpine (os dois com defer, nesta ordem) e registra o componente. */

/* As páginas de clientes que podem aparecer na seção "No ar hoje" (escolhidas pelo Bruno em
   19/10/2026). Os prints ficam em img/paginas/<slug>.webp. topo: a cor do alto da página, que vira
   a faixa da barra de status do iPhone; topoClaro e baseClara: se o fundo lá em cima e lá embaixo é
   claro, para os ícones da barra de status e a barrinha de início saírem escuros. Para pôr uma
   página nova: tirar o print (390 × 844, 2x), gerar o WebP de 500 px e medir as duas cores. */
var PAGINAS = [
  { slug: "lojasmari", nome: "Lojas Mari", topo: "#EAC2BD", topoClaro: true, baseClara: true },
  { slug: "dudautilidades", nome: "Duda Utilidades do Lar", topo: "#506178", topoClaro: false, baseClara: false },
  { slug: "nalicuscuzbar", nome: "Nali Cuscuz Bar", topo: "#523E31", topoClaro: false, baseClara: false },
  { slug: "adventureelove", nome: "Adventure & Love", topo: "#3A3934", topoClaro: false, baseClara: false },
  { slug: "fernandoferro", nome: "Fernando Ferro", topo: "#292A2C", topoClaro: false, baseClara: false },
  { slug: "sarahsampaio", nome: "Sarah Sampaio", topo: "#A29A95", topoClaro: false, baseClara: false },
  { slug: "vanessaandrade", nome: "Vanessa Andrade", topo: "#DED4C4", topoClaro: true, baseClara: true },
  { slug: "redebazzar", nome: "Rede Bazzar", topo: "#57756C", topoClaro: false, baseClara: false },
  { slug: "relojoarialitoral", nome: "Relojoaria Litoral", topo: "#4C504E", topoClaro: false, baseClara: false },
  { slug: "ferreiramotors", nome: "Ferreira Motors", topo: "#344140", topoClaro: false, baseClara: false },
  { slug: "heloisadepaula", nome: "Heloisa de Paula", topo: "#6F6056", topoClaro: false, baseClara: false },
  { slug: "institutopontodeluz", nome: "Instituto Ponto de Luz", topo: "#627C6D", topoClaro: false, baseClara: false },
  { slug: "retificacerri", nome: "Retífica Cerri", topo: "#374B48", topoClaro: false, baseClara: false },
  { slug: "antoniofernandes", nome: "Antônio Fernandes", topo: "#464B41", topoClaro: false, baseClara: false },
  { slug: "chalesurubici", nome: "Chalés Urubici", topo: "#283A36", topoClaro: false, baseClara: false },
  { slug: "gesqual", nome: "Gesqual Group", topo: "#3C4F5B", topoClaro: false, baseClara: false },
  { slug: "studiosarahsampaio", nome: "Studio Sarah Sampaio", topo: "#4F4747", topoClaro: false, baseClara: false },
  { slug: "elevalucro", nome: "Elevalucro", topo: "#263D3D", topoClaro: false, baseClara: false },
  { slug: "redosouzaemuneratti", nome: "Redó, Souza & Muneratti", topo: "#1B2534", topoClaro: false, baseClara: false },
  { slug: "liamaragomes", nome: "Liamara Gomes", topo: "#BAAEA8", topoClaro: true, baseClara: true },
  { slug: "kajubeautyface", nome: "Katia Guimarães", topo: "#D8B7BA", topoClaro: true, baseClara: true },
  { slug: "hydramaq", nome: "Hydramaq Hidráulica", topo: "#4E5F6C", topoClaro: false, baseClara: false },
  { slug: "alinesantana", nome: "Aline Santana", topo: "#A59F96", topoClaro: false, baseClara: false },
  { slug: "viniciusruffino", nome: "Vinicius Ruffino", topo: "#484840", topoClaro: false, baseClara: false },
  { slug: "ruthfoes", nome: "Ruth Fóes", topo: "#E3BEA1", topoClaro: true, baseClara: true },
  { slug: "realzaoutilidadesdolar", nome: "Rea1zão Utilidades do Lar", topo: "#8A6348", topoClaro: false, baseClara: false },
  { slug: "casadotita", nome: "Casa do Tita", topo: "#2E5A6A", topoClaro: false, baseClara: false },
  { slug: "lufilms", nome: "Lu Films", topo: "#2D4054", topoClaro: false, baseClara: false },
  { slug: "crochedadri", nome: "Crochê DaDri", topo: "#E7C4CA", topoClaro: true, baseClara: true },
  { slug: "anajulia", nome: "Ana Julia", topo: "#604C3C", topoClaro: false, baseClara: false },
  { slug: "amandatabet", nome: "Amanda Tabet", topo: "#8D9796", topoClaro: false, baseClara: false },
  { slug: "spacefm", nome: "SpaceFM 87,5", topo: "#556364", topoClaro: false, baseClara: false },
];

document.addEventListener("alpine:init", function () {
  /* A cada visita, 3 sorteadas entre as da lista. A do centro fica em destaque (o CSS cuida do
     tamanho, do reflexo e do pulsar; no celular, só ela aparece inteira, as outras por trás).
     No celular, a cada 4 s a da direita vem para o centro, girando entre as 3; no tablet, no
     computador e para quem pediu menos movimento, as três ficam paradas. */
  var CELULAR = window.matchMedia("(max-width: 39.99rem)");
  var CALMO = window.matchMedia("(prefers-reduced-motion: reduce)");
  var POSICOES = ["esquerda", "centro", "direita"];
  window.Alpine.data("vitrine", function () {
    return {
      escolhidas: [],
      atual: 0,
      init: function () {
        var lista = PAGINAS.slice();
        for (var i = lista.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var troca = lista[i]; lista[i] = lista[j]; lista[j] = troca;
        }
        this.escolhidas = lista.slice(0, 3);
        var vitrine = this;
        setInterval(function () {
          if (CELULAR.matches && !CALMO.matches && !document.hidden) vitrine.atual = (vitrine.atual + 1) % 3;
        }, 4000);
        // saiu do celular (girou a tela, abriu a janela): volta cada uma ao seu lugar
        CELULAR.addEventListener("change", function () { vitrine.atual = 0; });
      },
      posicao: function (i) {
        return POSICOES[(i - this.atual + 3) % 3];
      },
    };
  });
});

/* A faixa de clientes anda por CSS, e o navegador não carrega as imagens lazy que entram na tela
   andando (só as que já estavam à vista). Quando a faixa chega perto da tela, todas passam a carregar. */
(function () {
  var faixa = document.querySelector(".clientes-faixa");
  if (!faixa || !("IntersectionObserver" in window)) return;
  new IntersectionObserver(function (vistas, observador) {
    if (!vistas[0].isIntersecting) return;
    faixa.querySelectorAll('img[loading="lazy"]').forEach(function (img) { img.loading = "eager"; });
    observador.disconnect();
  }, { rootMargin: "600px 0px" }).observe(faixa);
})();

/* Seletor de idioma: guarda a escolha, que manda mais que o fuso do aparelho na próxima visita
   (o script do <head> do português lê "pl-idioma" antes de decidir se leva para en/ ou es/) */
document.addEventListener("click", function (evento) {
  var link = evento.target.closest && evento.target.closest("[data-idioma]");
  if (!link) return;
  try { localStorage.setItem("pl-idioma", link.getAttribute("data-idioma")); } catch (e) {}
});
