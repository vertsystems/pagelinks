// Gera as versões em inglês (en/index.html) e em espanhol (es/index.html) da página de vendas a partir do
// index.html em português, que é a fonte (pedido do Bruno em 21/10/2026). Roda dentro do construir.sh,
// antes do Tailwind: node _fonte/idiomas.mjs
//
// Cada texto em português está aqui com a tradução ao lado. Mudou um texto no index.html, o gerador para
// e diz qual trecho não achou: é só atualizar a linha aqui, com o português novo e as duas traduções.
// No fim ele procura palavra em português que tenha sobrado nas versões e para se achar.
//
// Fora do Brasil o preço é só em dólar (US$ 37, mudança grande a partir de US$ 5), no cartão
// internacional ou combinado no WhatsApp, sem parcelas (decisões do Bruno, 21/10/2026).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const AQUI = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://www.dunamiscompany.com.br/pagelinks/";
const WHATS = "https://wa.me/5513997287738?text=";

// ---------- trechos em português → [inglês, espanhol] ----------
// Os mais longos são trocados primeiro, para um trecho curto não estragar um longo que o contém.
const TEXTOS = [
  // cabeçalho do HTML
  [`<title>Página de Links com a cara da sua marca | Dunamis Company</title>`,
    `<title>Link Page with your brand's look | Dunamis Company</title>`,
    `<title>Página de Enlaces con el estilo de tu marca | Dunamis Company</title>`],
  [`content="Seu link da bio numa página feita com o seu logo e as suas cores, com WhatsApp, redes e QR Code. R$ 197, pagamento único, sem mensalidade."`,
    `content="Your link in bio on a page made with your logo and colors, with WhatsApp, social media and a QR code. US$ 37, one-time payment, no monthly fee."`,
    `content="Tu link en la bio en una página hecha con tu logo y tus colores, con WhatsApp, redes y código QR. US$ 37, pago único, sin mensualidad."`],
  [`<meta property="og:locale" content="pt_BR">`, `<meta property="og:locale" content="en_US">`, `<meta property="og:locale" content="es_LA">`],
  [`<meta property="og:title" content="Seu link da bio com a cara da sua marca">`,
    `<meta property="og:title" content="A link in bio that looks like your brand">`,
    `<meta property="og:title" content="Tu link en la bio, con el estilo de tu marca">`],
  [`<meta property="og:description" content="Uma página com seus links, WhatsApp e redes, feita com o seu logo e as suas cores. R$ 197, pagamento único.">`,
    `<meta property="og:description" content="A page with your links, WhatsApp and social media, made with your logo and colors. US$ 37, one-time payment.">`,
    `<meta property="og:description" content="Una página con tus links, WhatsApp y redes, hecha con tu logo y tus colores. US$ 37, pago único.">`],
  [`<meta property="og:url" content="${SITE}">`, `<meta property="og:url" content="${SITE}en/">`, `<meta property="og:url" content="${SITE}es/">`],
  [`<link rel="canonical" href="${SITE}">`, `<link rel="canonical" href="${SITE}en/">`, `<link rel="canonical" href="${SITE}es/">`],
  [`content="${SITE}img/og.png"`, `content="${SITE}img/og-en.png"`, `content="${SITE}img/og-es.png"`],
  [`<html lang="pt-BR"`, `<html lang="en"`, `<html lang="es"`],

  // topo
  [`<span>Desenvolvido por</span>`, `<span>Developed by</span>`, `<span>Desarrollado por</span>`],
  [`<p class="olho max-sm:text-[14.4px]">Página de Links</p>`, `<p class="olho max-sm:text-[14.4px]">Link Page</p>`, `<p class="olho max-sm:text-[14.4px]">Página de Enlaces</p>`],
  [`>Seu link da bio com a cara da sua marca.</h1>`, `>A link in bio that looks like your brand.</h1>`, `>Tu link en la bio, con el estilo de tu marca.</h1>`],
  [`>Uma página com seus links, WhatsApp e redes, feita com o seu logo e as suas cores. Você vê a primeira versão em até 24 horas.</p>`,
    `>A page with your links, WhatsApp and social media, made with your logo and your colors. You see the first version within 24 hours.</p>`,
    `>Una página con tus links, WhatsApp y redes, hecha con tu logo y tus colores. Recibes la primera versión en menos de 24 horas.</p>`],
  [`R$ 197</strong>, pagamento único.<br class="sm:hidden"> Sem mensalidade.`,
    `US$ 37</strong>, one-time payment.<br class="sm:hidden"> No monthly fee.`,
    `US$ 37</strong>, pago único.<br class="sm:hidden"> Sin mensualidad.`],
  [`${WHATS}Oi%21%20Vi%20a%20P%C3%A1gina%20de%20Links%20e%20quero%20a%20minha.`,
    WHATS + encodeURIComponent("Hi! I saw the Link Page and I'd like mine."),
    WHATS + encodeURIComponent("¡Hola! Vi la Página de Enlaces y quiero la mía.")],
  [`Quero minha PageLinks`, `I want my PageLinks`, `Quiero mi PageLinks`],
  [`>Rápido e prático.</p>`, `>Quick and easy.</p>`, `>Rápido y práctico.</p>`],

  // 2. o problema
  [`<p class="olho">O link da bio de hoje</p>`, `<p class="olho">The link in bio today</p>`, `<p class="olho">El link en la bio de hoy</p>`],
  [`O cliente toca no seu link e cai num lugar que não parece você.`,
    `Customers tap your link and land somewhere that doesn't look like you.`,
    `El cliente toca tu link y cae en un lugar que no se parece a ti.`],
  [`Ele viu seu post, gostou e tocou no link da bio. Chegou numa lista de botões igual à de qualquer outro perfil, com o cardápio antigo e uma promoção que já acabou.`,
    `They saw your post, liked it and tapped the link in your bio. They landed on a list of buttons like any other profile's, with an old menu and a promotion that has already ended.`,
    `Vio tu post, le gustó y tocó el link de tu bio. Llegó a una lista de botones igual a la de cualquier otro perfil, con el menú viejo y una promoción que ya terminó.`],
  [`O link da bio é a porta da sua loja no Instagram. Quando ela parece de outro lugar, o cliente desconfia justo na hora em que ia comprar.`,
    `Your link in bio is the door to your store on Instagram. When it looks like it belongs somewhere else, customers hesitate right when they were about to buy.`,
    `El link en la bio es la puerta de tu tienda en Instagram. Cuando parece de otro lugar, el cliente desconfía justo cuando iba a comprar.`],
  [`A Página de Links troca essa lista por uma página feita para a sua marca, que a gente mantém em dia para você.`,
    `The Link Page replaces that list with a page made for your brand, and we keep it up to date for you.`,
    `La Página de Enlaces cambia esa lista por una página hecha para tu marca, que mantenemos al día por ti.`],

  // 3. o que vem na página
  [`<p class="olho">O que você recebe</p>`, `<p class="olho">What you get</p>`, `<p class="olho">Lo que recibes</p>`],
  [`Tudo o que o seu cliente procura, num toque.`, `Everything your customers look for, in one tap.`, `Todo lo que tu cliente busca, en un toque.`],
  [`<strong class="font-semibold">A sua marca na página toda.</strong> <span class="text-apoio-claro">Logo, cores e fotos do seu negócio.</span>`,
    `<strong class="font-semibold">Your brand across the whole page.</strong> <span class="text-apoio-claro">Your business's logo, colors and photos.</span>`,
    `<strong class="font-semibold">Tu marca en toda la página.</strong> <span class="text-apoio-claro">Logo, colores y fotos de tu negocio.</span>`],
  [`<strong class="font-semibold">Até 5 blocos.</strong> <span class="text-apoio-claro">Links, WhatsApp com mensagem pronta, redes sociais, localização, cardápio ou catálogo e botão de destaque.</span>`,
    `<strong class="font-semibold">Up to 5 blocks.</strong> <span class="text-apoio-claro">Links, WhatsApp with a ready-made message, social media, location, menu or catalog, and a featured button.</span>`,
    `<strong class="font-semibold">Hasta 5 bloques.</strong> <span class="text-apoio-claro">Links, WhatsApp con mensaje listo, redes sociales, ubicación, menú o catálogo y botón destacado.</span>`],
  [`<strong class="font-semibold">Endereço fixo.</strong> <span class="text-apoio-claro">dnms.fun/suaempresa, para pôr na bio e no material impresso.</span>`,
    `<strong class="font-semibold">A fixed address.</strong> <span class="text-apoio-claro">dnms.fun/yourbusiness, for your bio and your printed materials.</span>`,
    `<strong class="font-semibold">Dirección fija.</strong> <span class="text-apoio-claro">dnms.fun/tuempresa, para poner en la bio y en el material impreso.</span>`],
  [`<strong class="font-semibold">QR Code em alta resolução.</strong> <span class="text-apoio-claro">Pronto para imprimir.</span>`,
    `<strong class="font-semibold">High-resolution QR code.</strong> <span class="text-apoio-claro">Ready to print.</span>`,
    `<strong class="font-semibold">Código QR en alta resolución.</strong> <span class="text-apoio-claro">Listo para imprimir.</span>`],
  [`<strong class="font-semibold">Hospedagem para sempre.</strong> <span class="text-apoio-claro">Sem mensalidade e sem renovação.</span>`,
    `<strong class="font-semibold">Lifetime hosting.</strong> <span class="text-apoio-claro">No monthly fee and no renewals.</span>`,
    `<strong class="font-semibold">Alojamiento de por vida.</strong> <span class="text-apoio-claro">Sin mensualidad y sin renovación.</span>`],
  [`<strong class="font-semibold">Trocas sem custo.</strong> <span class="text-apoio-claro">Mudou um link, um texto ou uma foto? É só pedir no WhatsApp.</span>`,
    `<strong class="font-semibold">Free updates.</strong> <span class="text-apoio-claro">Changed a link, a text or a photo? Just ask on WhatsApp.</span>`,
    `<strong class="font-semibold">Cambios sin costo.</strong> <span class="text-apoio-claro">¿Cambió un link, un texto o una foto? Solo pídelo por WhatsApp.</span>`],
  [`<strong class="font-semibold">Promoção com data.</strong> <span class="text-apoio-claro">O link troca sozinho no dia em que a promoção começa e volta quando ela acaba.</span>`,
    `<strong class="font-semibold">Scheduled promotions.</strong> <span class="text-apoio-claro">The link switches on its own the day the promotion starts and switches back when it ends.</span>`,
    `<strong class="font-semibold">Promociones con fecha.</strong> <span class="text-apoio-claro">El link cambia solo el día que empieza la promoción y vuelve cuando termina.</span>`],
  [`>Um QR Code que você imprime uma vez só.</h3>`, `>A QR code you print only once.</h3>`, `>Un código QR que imprimes una sola vez.</h3>`],
  [`Imprimiu no cardápio, na embalagem ou na vitrine? Ele leva sempre para a sua página. Mudou a promoção, a gente muda a página, e o QR Code continua certo.`,
    `Printed it on your menu, packaging or shop window? It always leads to your page. When the promotion changes, we change the page, and the QR code stays right.`,
    `¿Lo imprimiste en el menú, en el empaque o en la vitrina? Siempre lleva a tu página. Si cambia la promoción, cambiamos la página, y el QR sigue correcto.`],

  // 4. as páginas no ar
  [`<p class="olho">No ar hoje</p>`, `<p class="olho">Live today</p>`, `<p class="olho">En línea hoy</p>`],
  [`Cada página com a cara do próprio negócio.`, `Every page looks like its own business.`, `Cada página con el estilo de su propio negocio.`],
  [`Toque para abrir a página de verdade, do jeito que o cliente deles vê.`, `Tap to open the real page, just as their customers see it.`, `Toca para abrir la página real, tal como la ven sus clientes.`],
  [`:alt="'Página de links de ' + p.nome + ' no celular'"`, `:alt="p.nome + ' link page on a phone'"`, `:alt="'Página de enlaces de ' + p.nome + ' en el celular'"`],
  [`alt="Página de links de Lojas Mari no celular"`, `alt="Lojas Mari link page on a phone"`, `alt="Página de enlaces de Lojas Mari en el celular"`],
  [`alt="Página de links de Duda Utilidades do Lar no celular"`, `alt="Duda Utilidades do Lar link page on a phone"`, `alt="Página de enlaces de Duda Utilidades do Lar en el celular"`],
  [`alt="Página de links de Nali Cuscuz Bar no celular"`, `alt="Nali Cuscuz Bar link page on a phone"`, `alt="Página de enlaces de Nali Cuscuz Bar en el celular"`],
  [`>Ver a página</a>`, `>See the page</a>`, `>Ver la página</a>`],

  // 5. como funciona e preço
  [`<p class="olho">Como funciona</p>`, `<p class="olho">How it works</p>`, `<p class="olho">Cómo funciona</p>`],
  [`Em três passos, e você vê antes de ir ao ar.`, `Three steps, and you see it before it goes live.`, `En tres pasos, y la ves antes de publicarla.`],
  [`Você chama no WhatsApp e manda o logo, as cores e os links.`, `You message us on WhatsApp and send your logo, colors and links.`, `Nos escribes por WhatsApp y envías el logo, los colores y los links.`],
  [`Em até 24 horas depois do pagamento, recebe a primeira versão para ver.`, `Within 24 hours of payment, you receive the first version to review.`, `En menos de 24 horas después del pago, recibes la primera versión para revisar.`],
  [`Aprovou, a página vai ao ar com o QR Code pronto.`, `Once you approve it, the page goes live with the QR code ready.`, `Cuando la apruebas, la página se publica con el código QR listo.`],
  [`<p class="olho">Investimento</p>`, `<p class="olho">Investment</p>`, `<p class="olho">Inversión</p>`],
  [`<strong class="font-semibold">Garantia de 7 dias.</strong> Se não gostar da primeira versão, devolvemos o valor.`,
    `<strong class="font-semibold">7-day guarantee.</strong> If you don't like the first version, we refund you.`,
    `<strong class="font-semibold">Garantía de 7 días.</strong> Si no te gusta la primera versión, te devolvemos el dinero.`],

  // 6. quem está à frente
  [`alt="Bruno Santana, empresário e fundador da Dunamis Company"`, `alt="Bruno Santana, entrepreneur and founder of Dunamis Company"`, `alt="Bruno Santana, empresario y fundador de Dunamis Company"`],
  [`aria-label="Onde encontrar o Bruno"`, `aria-label="Where to find Bruno"`, `aria-label="Dónde encontrar a Bruno"`],
  [`aria-label="Instagram do Bruno Santana"`, `aria-label="Bruno Santana on Instagram"`, `aria-label="Instagram de Bruno Santana"`],
  [`aria-label="Portfólio do Bruno Santana no Behance"`, `aria-label="Bruno Santana's portfolio on Behance"`, `aria-label="Portafolio de Bruno Santana en Behance"`],
  [`aria-label="Conversar com o Bruno no WhatsApp"`, `aria-label="Chat with Bruno on WhatsApp"`, `aria-label="Hablar con Bruno por WhatsApp"`],
  [`aria-label="Site da Dunamis Company"`, `aria-label="Dunamis Company website"`, `aria-label="Sitio de Dunamis Company"`],
  [`${WHATS}Oi%2C%20Bruno%21%20Vi%20a%20P%C3%A1gina%20de%20Links%20e%20quero%20conversar.`,
    WHATS + encodeURIComponent("Hi, Bruno! I saw the Link Page and I'd like to talk."),
    WHATS + encodeURIComponent("¡Hola, Bruno! Vi la Página de Enlaces y quiero conversar.")],
  [`<p class="olho">Quem está à frente</p>`, `<p class="olho">Who's behind it</p>`, `<p class="olho">Quién está al frente</p>`],
  [`>Empresário e fundador da Dunamis Company</p>`, `>Entrepreneur and founder of Dunamis Company</p>`, `>Empresario y fundador de Dunamis Company</p>`],
  [`Atuando com o digital desde 2005, construiu em mais de 20 anos de mercado uma trajetória em marca, design e desenvolvimento web, e trabalhou em projetos com Ambev, Tetra Pak, Frutap e Frigonossa no desenvolvimento de marcas próprias e materiais publicitários. Foram mais de 200 produtos criados e distribuídos em todo o Brasil, com forte expansão em São Paulo e Minas Gerais.`,
    `Working in digital since 2005, he has built a career of more than 20 years in branding, design and web development, including projects with Ambev, Tetra Pak, Frutap and Frigonossa on private-label products and advertising materials. More than 200 products were created and distributed across Brazil, with strong growth in São Paulo and Minas Gerais.`,
    `Activo en el mundo digital desde 2005, construyó en más de 20 años de mercado una trayectoria en marca, diseño y desarrollo web, y trabajó en proyectos con Ambev, Tetra Pak, Frutap y Frigonossa en el desarrollo de marcas propias y materiales publicitarios. Fueron más de 200 productos creados y distribuidos en todo Brasil, con fuerte expansión en São Paulo y Minas Gerais.`],
  [`À frente da Dunamis Company, atende clientes como Lojas Mari, Rede Bazzar, Chalés Urubici, Retífica Cerri, Adventure &amp; Love e Nali Cuscuz Bar, entre dezenas de outras marcas do varejo, da gastronomia, do turismo e da indústria. A carteira também inclui empresas nos Estados Unidos, na Alemanha, em Portugal e na Irlanda, e os sites e serviços digitais da Dunamis são acessados em mais de 62 países.`,
    `As head of Dunamis Company, he serves clients such as Lojas Mari, Rede Bazzar, Chalés Urubici, Retífica Cerri, Adventure &amp; Love and Nali Cuscuz Bar, among dozens of other brands in retail, food service, tourism and industry. The client base also includes companies in the United States, Germany, Portugal and Ireland, and the websites and digital services built by Dunamis are accessed in more than 62 countries.`,
    `Al frente de Dunamis Company, atiende a clientes como Lojas Mari, Rede Bazzar, Chalés Urubici, Retífica Cerri, Adventure &amp; Love y Nali Cuscuz Bar, entre decenas de otras marcas del comercio, la gastronomía, el turismo y la industria. La cartera también incluye empresas en Estados Unidos, Alemania, Portugal e Irlanda, y los sitios y servicios digitales de Dunamis se visitan en más de 62 países.`],
  [`A Dunamis tem trabalhado em uma nova frente. São sistemas sob medida, desenvolvidos para organizar a operação dos clientes, centralizar as informações e reduzir o trabalho manual das equipes. A Página de Links é um deles. É um serviço próprio, construído dentro do ecossistema da Dunamis para manter alto desempenho e qualidade constante em toda a base de clientes.`,
    `Dunamis has been working on a new front. These are custom systems, built to organize clients' operations, centralize information and reduce manual work for their teams. The Link Page is one of them. It is an in-house service, built within the Dunamis ecosystem to keep high performance and consistent quality across the whole client base.`,
    `Dunamis ha estado trabajando en un nuevo frente. Son sistemas a medida, desarrollados para organizar la operación de los clientes, centralizar la información y reducir el trabajo manual de los equipos. La Página de Enlaces es uno de ellos. Es un servicio propio, construido dentro del ecosistema de Dunamis para mantener alto rendimiento y calidad constante en toda la base de clientes.`],
  [`>Algumas marcas com que já trabalhamos</p>`, `>Some of the brands we've worked with</p>`, `>Algunas marcas con las que ya trabajamos</p>`],

  // 7. perguntas
  [`<p class="olho">Perguntas</p>`, `<p class="olho">Questions</p>`, `<p class="olho">Preguntas</p>`],
  [`O que costumam perguntar.`, `What people usually ask.`, `Lo que suelen preguntar.`],
  [`<summary>O Linktree é de graça. Por que pagar?</summary>`, `<summary>Linktree is free. Why pay?</summary>`, `<summary>Linktree es gratis. ¿Por qué pagar?</summary>`],
  [`<p>O gratuito te dá o mesmo molde de todo mundo. Aqui a página é feita para a sua marca, o endereço e o QR Code não mudam, e a gente cuida das trocas de link para você.</p>`,
    `<p>The free version gives you the same template as everyone else. Here the page is made for your brand, the address and the QR code never change, and we handle link updates for you.</p>`,
    `<p>La versión gratis te da el mismo molde que a todos. Aquí la página se hace para tu marca, la dirección y el código QR no cambian, y nosotros nos encargamos de los cambios de link.</p>`],
  [`<summary>Tem mensalidade?</summary>`, `<summary>Is there a monthly fee?</summary>`, `<summary>¿Tiene mensualidad?</summary>`],
  [`<p>Não. R$ 197 uma vez só, com a hospedagem incluída.</p>`, `<p>No. US$ 37 once, with hosting included.</p>`, `<p>No. US$ 37 una sola vez, con el alojamiento incluido.</p>`],
  [`<summary>E quando eu precisar trocar um link?</summary>`, `<summary>What if I need to change a link?</summary>`, `<summary>¿Y cuando necesite cambiar un link?</summary>`],
  [`<p>Manda no WhatsApp e a gente troca, sem custo. Mudança grande, como visual novo ou mais de 5 blocos, sai a partir de R$ 25.</p>`,
    `<p>Send it on WhatsApp and we change it at no cost. Bigger changes, like a new design or more than 5 blocks, start at US$ 5.</p>`,
    `<p>Envíalo por WhatsApp y lo cambiamos sin costo. Los cambios grandes, como un diseño nuevo o más de 5 bloques, cuestan desde US$ 5.</p>`],
  [`<summary>O endereço é meu?</summary>`, `<summary>Do I own the address?</summary>`, `<summary>¿La dirección es mía?</summary>`],
  [`<p>O dnms.fun é da Dunamis, e é ele que mantém sua página e seu QR Code no ar. Se um dia o serviço acabar, você é avisado com 6 meses de antecedência e recebe ajuda para mudar.</p>`,
    `<p>dnms.fun belongs to Dunamis, and it is what keeps your page and your QR code online. If the service ever ends, you will be notified 6 months in advance and get help to move.</p>`,
    `<p>dnms.fun es de Dunamis, y es lo que mantiene tu página y tu código QR en línea. Si algún día el servicio termina, te avisamos con 6 meses de anticipación y te ayudamos a migrar.</p>`],
  [`<summary>Em quanto tempo fica pronta?</summary>`, `<summary>How long does it take?</summary>`, `<summary>¿En cuánto tiempo está lista?</summary>`],
  [`<p>A primeira versão chega em até 24 horas depois do pagamento. Você vê, pede ajuste se precisar, e só então ela vai ao ar.</p>`,
    `<p>The first version arrives within 24 hours of payment. You review it, ask for changes if needed, and only then does it go live.</p>`,
    `<p>La primera versión llega en menos de 24 horas después del pago. La revisas, pides ajustes si hace falta, y solo entonces se publica.</p>`],
  [`<summary>Como eu pago?</summary>`, `<summary>How do I pay?</summary>`, `<summary>¿Cómo pago?</summary>`],
  [`<p>Pix, ou cartão em até 3x sem juros. O total é o mesmo: R$ 197.</p>`,
    `<p>By international credit card, in a single payment, or another way we arrange on WhatsApp. The total is US$ 37.</p>`,
    `<p>Con tarjeta de crédito internacional, en un solo pago, u otra forma que acordamos por WhatsApp. El total es US$ 37.</p>`],

  // 8. chamada final e rodapé
  [`Vamos construir a sua?`, `Shall we build yours?`, `¿Construimos la tuya?`],
  [`Chama no WhatsApp, conta do seu negócio e manda os links. A gente monta e te mostra antes de ir ao ar.`,
    `Message us on WhatsApp, tell us about your business and send your links. We build it and show you before it goes live.`,
    `Escríbenos por WhatsApp, cuéntanos de tu negocio y envía los links. La armamos y te la mostramos antes de publicarla.`],
  [`Dunamis Company LTDA. · Sorocaba/SP · CNPJ`, `Dunamis Company LTDA. · Sorocaba/SP, Brazil · CNPJ`, `Dunamis Company LTDA. · Sorocaba/SP, Brasil · CNPJ`],
];

// ---------- blocos que mudam por inteiro ----------
// o preço: fora do Brasil, só US$ 37, sem as 3 parcelas ao lado
const PRECO_PT = `        <!-- o preço e, ao lado, as 3 parcelas (197 ÷ 3 = 65,67; mudou o preço, muda a parcela) -->
        <div class="mt-1.5 mb-3.5 flex flex-wrap items-center gap-x-5 gap-y-3">
          <p class="text-[clamp(3.4rem,9vw,5.25rem)] leading-none font-extrabold tracking-[-0.03em] tabular-nums"><small class="mr-1.5 align-[.9em] text-[.4em] font-semibold tracking-normal">R$</small>197</p>
          <p class="border-l border-linha-clara pl-5 text-sm leading-snug text-apoio-claro">ou 3x de<strong class="block text-[clamp(1.4rem,3vw,1.75rem)] leading-tight font-extrabold tracking-[-0.02em] text-off tabular-nums">R$&nbsp;65,67</strong>sem juros</p>
        </div>
        <p class="text-apoio-claro">Pagamento único. Pix, ou cartão em até 3x sem juros (R$&nbsp;197 no total).</p>`;
const precoFora = (pagamento) => `        <p class="mt-1.5 mb-3.5 text-[clamp(3.4rem,9vw,5.25rem)] leading-none font-extrabold tracking-[-0.03em] tabular-nums"><small class="mr-1.5 align-[.9em] text-[.4em] font-semibold tracking-normal">US$</small>37</p>
        <p class="text-apoio-claro">${pagamento}</p>`;

// as 9 manchetes do topo, na mesma ordem das do português
const MANCHETES = {
  en: [
    ["A link in bio that looks like your brand.", "A page with your links, WhatsApp and social media, made with your logo and your colors. You see the first version within 24 hours."],
    ["From post to WhatsApp, all in your brand.", "Your links, social media and WhatsApp on a page made with your logo and colors, so customers recognize your brand with every tap."],
    ["Your profile looks great. Your link in bio can too.", "Swap the list of identical buttons for a page made with your brand identity, ready within 24 hours."],
    ["The first contact with your brand starts with a tap.", "Your link in bio is what customers open before they message, buy or visit. Give that moment your logo, your colors and the right paths."],
    ["The shortest path from your post to your WhatsApp.", "Customers tap the link and land in a chat with a ready-made message, or on your menu, catalog and location, all on a page with your brand."],
    ["Fewer taps between interest and purchase.", "WhatsApp, menu, catalog and location right on the first screen, on a page made with your logo and colors."],
    ["A QR code you print only once.", "When the promotion or the menu changes, we update the page, and the QR code on your packaging, shop window and menu keeps leading to the right place."],
    ["No tools to learn, nothing to build yourself.", "We build your link page with your brand identity and handle the changes afterwards. You just send the links on WhatsApp."],
    ["Your link in bio, always up to date.", "When the promotion, the menu or the phone number changes, just send it on WhatsApp and we update it, at no cost."],
  ],
  es: [
    ["Tu link en la bio, con el estilo de tu marca.", "Una página con tus links, WhatsApp y redes, hecha con tu logo y tus colores. Recibes la primera versión en menos de 24 horas."],
    ["Del post al WhatsApp, todo con tu identidad.", "Tus links, redes y WhatsApp en una página hecha con tu logo y tus colores, para que el cliente reconozca tu marca en cada toque."],
    ["Tu perfil es impecable. Tu link en la bio puede serlo.", "Cambia la lista de botones iguales por una página hecha con la identidad de tu marca, lista en menos de 24 horas."],
    ["El primer contacto con tu marca empieza con un toque.", "El link en la bio es lo que el cliente abre antes de escribirte, comprar o visitarte. Haz que ese momento tenga tu logo, tus colores y los caminos correctos."],
    ["El camino más corto de tu post a tu WhatsApp.", "El cliente toca el link y llega a una conversación con mensaje listo, o al menú, al catálogo y a la ubicación, todo en una página con tu marca."],
    ["Menos toques entre el interés y la compra.", "WhatsApp, menú, catálogo y ubicación en la primera pantalla, en una página hecha con tu logo y tus colores."],
    ["Un código QR que imprimes una sola vez.", "Si cambia la promoción o el menú, actualizamos la página, y el QR del empaque, de la vitrina y del menú sigue llevando al lugar correcto."],
    ["Sin aprender herramientas y sin armar nada solo.", "Hacemos tu página de enlaces con la identidad de tu marca y nos encargamos de los cambios después. Tú solo envías los links por WhatsApp."],
    ["Tu link en la bio siempre al día, sin tocar nada.", "Si cambia la promoción, el menú o el número, solo envíalo por WhatsApp y lo cambiamos sin costo."],
  ],
};

// os dados para o Google (JSON-LD), na língua de cada versão
function dadosParaOGoogle(idioma) {
  const en = idioma === "en";
  const perguntas = en
    ? [
        ["Linktree is free. Why pay?", "The free version gives you the same template as everyone else. Here the page is made for your brand, the address and the QR code never change, and we handle link updates for you."],
        ["Is there a monthly fee?", "No. US$ 37 once, with hosting included."],
        ["What if I need to change a link?", "Send it on WhatsApp and we change it at no cost. Bigger changes, like a new design or more than 5 blocks, start at US$ 5."],
        ["Do I own the address?", "dnms.fun belongs to Dunamis, and it is what keeps your page and your QR code online. If the service ever ends, you will be notified 6 months in advance and get help to move."],
        ["How long does it take?", "The first version arrives within 24 hours of payment. You review it, ask for changes if needed, and only then does it go live."],
        ["How do I pay?", "By international credit card, in a single payment, or another way we arrange on WhatsApp. The total is US$ 37."],
      ]
    : [
        ["Linktree es gratis. ¿Por qué pagar?", "La versión gratis te da el mismo molde que a todos. Aquí la página se hace para tu marca, la dirección y el código QR no cambian, y nosotros nos encargamos de los cambios de link."],
        ["¿Tiene mensualidad?", "No. US$ 37 una sola vez, con el alojamiento incluido."],
        ["¿Y cuando necesite cambiar un link?", "Envíalo por WhatsApp y lo cambiamos sin costo. Los cambios grandes, como un diseño nuevo o más de 5 bloques, cuestan desde US$ 5."],
        ["¿La dirección es mía?", "dnms.fun es de Dunamis, y es lo que mantiene tu página y tu código QR en línea. Si algún día el servicio termina, te avisamos con 6 meses de anticipación y te ayudamos a migrar."],
        ["¿En cuánto tiempo está lista?", "La primera versión llega en menos de 24 horas después del pago. La revisas, pides ajustes si hace falta, y solo entonces se publica."],
        ["¿Cómo pago?", "Con tarjeta de crédito internacional, en un solo pago, u otra forma que acordamos por WhatsApp. El total es US$ 37."],
      ];
  const dados = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://www.dunamiscompany.com.br/#empresa",
        name: "Dunamis Company",
        url: "https://www.dunamiscompany.com.br/",
        logo: "https://www.dunamiscompany.com.br/assets/img/logo-principal-fundo-escuro.png",
        telephone: "+55-13-99728-7738",
        address: { "@type": "PostalAddress", addressLocality: "Sorocaba", addressRegion: "SP", addressCountry: "BR" },
        sameAs: ["https://www.instagram.com/digitaldunamis"],
        founder: {
          "@type": "Person",
          name: "Bruno Santana",
          jobTitle: en ? "Entrepreneur and founder of Dunamis Company" : "Empresario y fundador de Dunamis Company",
          image: SITE + "img/bruno-santana.webp",
          sameAs: ["https://www.instagram.com/brunosantana.x/", "https://www.behance.net/brunosantana_x"],
        },
      },
      {
        "@type": "Service",
        name: en ? "Link Page" : "Página de Enlaces",
        description: en
          ? "Link-in-bio page made with the brand's identity, with a fixed address, QR code and hosting with no monthly fee."
          : "Página de enlaces para la bio, hecha con la identidad de la marca, con dirección fija, código QR y alojamiento sin mensualidad.",
        provider: { "@id": "https://www.dunamiscompany.com.br/#empresa" },
        offers: { "@type": "Offer", price: "37.00", priceCurrency: "USD", url: SITE + idioma + "/" },
      },
      {
        "@type": "FAQPage",
        mainEntity: perguntas.map(([pergunta, resposta]) => ({ "@type": "Question", name: pergunta, acceptedAnswer: { "@type": "Answer", text: resposta } })),
      },
    ],
  };
  return `<script type="application/ld+json">\n${JSON.stringify(dados, null, 2)}\n</script>`;
}

// o seletor de idioma, igual ao que está escrito no index.html
function seletor(atual, extra) {
  const base = atual === "pt" ? "" : "../";
  const href = (codigo) => (codigo === atual ? "./" : codigo === "pt" ? base || "./" : base + codigo + "/");
  const link = (codigo, nome) =>
    `<a href="${href(codigo)}" hreflang="${codigo}" lang="${codigo}" title="${nome}" data-idioma="${codigo}"${codigo === atual ? ' aria-current="page"' : ""}>${codigo.toUpperCase()}</a>`;
  return `<nav class="idiomas${extra}" aria-label="${atual === "en" ? "Language" : "Idioma"}">
      ${link("pt", "Português")}
      ${link("en", "English")}
      ${link("es", "Español")}
    </nav>`;
}

// ---------- montagem ----------
const pt = readFileSync(join(AQUI, "index.html"), "utf8");
const exigir = (texto, trecho, idioma) => {
  if (!texto.includes(trecho)) throw new Error(`[${idioma}] não achei no index.html:\n  ${trecho.slice(0, 160)}\n  → atualize este trecho em _fonte/idiomas.mjs`);
};

// nomes próprios que podem ter palavra em português (marcas dos clientes, cidades): saem da conferência
const NOMES = ["Lojas Mari", "Rede Bazzar", "Chalés Urubici", "Retífica Cerri", "Nali Cuscuz Bar", "Duda Utilidades do Lar", "Realzão Utilidades do Lar", "Da Serra Distribuidora", "Casa do Tita Praia Grande", "Rede Krill Supermercados", "São Paulo", "Minas Gerais", "Ferreira Motor's", "Português", "Dunamis Company LTDA."];
// sinais de português que não existem em inglês nem em espanhol (os limites de palavra entendem acento,
// o que o \b do JavaScript não faz)
const SINAIS_PT = /(?<!\p{L})(você|vocês|seu|sua|seus|suas|não|nós|então|também|pagamento|página de links|mensalidade|cardápio|loja|cliente deles|a gente|pra|grátis)(?!\p{L})|ção|ções|ões|ã|õ|R\$/giu;

for (const idioma of ["en", "es"]) {
  const i = idioma === "en" ? 1 : 2;
  let html = pt;

  // 1. o que sai: o redirecionamento por país só existe no português
  html = html.replace(/<!-- idioma:inicio -->[\s\S]*?<!-- idioma:fim -->\n/, "");
  // 2. blocos inteiros
  exigir(html, PRECO_PT, idioma);
  html = html.replace(PRECO_PT, precoFora(idioma === "en"
    ? "One-time payment by international credit card, or another way we arrange on WhatsApp."
    : "Pago único con tarjeta de crédito internacional, u otra forma que acordamos por WhatsApp."));
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, dadosParaOGoogle(idioma));
  const lista = MANCHETES[idioma].map((m) => "          " + JSON.stringify(m)).join(",\n");
  if (!/var MANCHETES = \[[\s\S]*?\n\s*\];/.test(html)) throw new Error(`[${idioma}] não achei a lista MANCHETES no index.html`);
  html = html.replace(/var MANCHETES = \[[\s\S]*?\n(\s*)\];/, (_, recuo) => `var MANCHETES = [\n${lista}\n${recuo}];`);
  for (const extra of [" idiomas--topo", ""]) {
    exigir(html, seletor("pt", extra), idioma);
    html = html.replace(seletor("pt", extra), seletor(idioma, extra));
  }
  // 3. os textos, do mais longo para o mais curto
  for (const linha of [...TEXTOS].sort((a, b) => b[0].length - a[0].length)) {
    exigir(html, linha[0], idioma);
    html = html.split(linha[0]).join(linha[i]);
  }
  // 4. caminhos: a versão mora uma pasta abaixo, e usa os mesmos arquivos do português
  html = html
    .replace(/(href|src|srcset|imagesrcset)="(assets|img)\//g, '$1="../$2/')
    .replace(/, img\//g, ", ../img/")
    .replace(/'img\/paginas\/'/g, "'../img/paginas/'");
  // 5. aviso de arquivo gerado
  html = html.replace("<!DOCTYPE html>\n", "<!DOCTYPE html>\n<!-- Gerado por _fonte/idiomas.mjs a partir do index.html (português). Não editar aqui: mude o português e a tradução no gerador -->\n");

  // conferência: português que sobrou no texto visível
  let visivel = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
        .replace(/<script>[\s\S]*?<\/script>/g, (bloco) => { const m = bloco.match(/var MANCHETES = (\[[\s\S]*?\n\s*\]);/); return m ? " " + m[1] + " " : " "; })
    .replace(/<[^>]+>/g, " ");
  for (const nome of NOMES) visivel = visivel.split(nome).join(" ");
  const sobras = [...new Set((visivel.match(SINAIS_PT) || []).map((s) => s.toLowerCase()))];
  if (sobras.length) {
    const contexto = sobras.map((s) => { const k = visivel.toLowerCase().indexOf(s); return `  "${s}": …${visivel.slice(Math.max(0, k - 50), k + 50).replace(/\s+/g, " ")}…`; });
    throw new Error(`[${idioma}] sobrou português na versão:\n${contexto.join("\n")}`);
  }

  mkdirSync(join(AQUI, idioma), { recursive: true });
  writeFileSync(join(AQUI, idioma, "index.html"), html);
  console.log(`${idioma}/index.html: ${Buffer.byteLength(html)} bytes`);
}
