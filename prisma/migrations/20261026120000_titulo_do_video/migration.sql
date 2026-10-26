-- O título do bloco de vídeo passa a aparecer embaixo do vídeo, com a legenda (subtitulo)
-- embaixo dele (26/10/2026). Até aqui o título só era o nome do vídeo para o leitor de tela.
-- Os dois vídeos que tinham título eram nomes que vieram do WordPress, e passariam a aparecer
-- nas páginas sem o cliente ver: ficam sem título, e a página continua igual.
--   roneyvideomaker  cmvi721a1000008l6ymq1fz1b  "Video Cliente"
--   nalicuscuzbar    cmvjmd1ca000008i77ve8m53x  "Video Apresentação NaLi Cuscuzbar"

UPDATE "Card" SET "titulo" = NULL
WHERE "tipo" = 'video' AND (
  ("id" = 'cmvi721a1000008l6ymq1fz1b' AND "titulo" = 'Video Cliente') OR
  ("id" = 'cmvjmd1ca000008i77ve8m53x' AND "titulo" = 'Video Apresentação NaLi Cuscuzbar')
);

-- Down: desfazer à mão, o Prisma não roda esta parte
-- UPDATE "Card" SET "titulo" = 'Video Cliente' WHERE "id" = 'cmvi721a1000008l6ymq1fz1b';
-- UPDATE "Card" SET "titulo" = 'Video Apresentação NaLi Cuscuzbar' WHERE "id" = 'cmvjmd1ca000008i77ve8m53x';
