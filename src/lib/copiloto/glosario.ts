/**
 * Glosario en lenguaje sencillo (GLOS, L628) y la búsqueda de ayuda de un indicador (tipFor,
 * L648): un indicador cuyo nombre coincide con la expresión de un término muestra su «i».
 * Generado desde el original.
 */
export interface GlossaryTerm {
  term: string;
  text: string;
  re: RegExp;
}

export const GLOS: GlossaryTerm[] = [
  {
    term: "CPA",
    text: "Costo por adquisición: lo que pagas en anuncios por cada pedido. Si es mayor que la utilidad por pedido, pierdes plata.",
    re: /CPA/,
  },
  {
    term: "ROAS",
    text: "Retorno sobre la publicidad: ventas ÷ gasto en anuncios. ROAS 3× = vendes $3 por cada $1 de pauta. El de equilibrio es el mínimo para no perder.",
    re: /ROAS/,
  },
  {
    term: "AOV / ticket promedio",
    text: "Lo que paga en promedio cada cliente. Se sube con combos y upsells.",
    re: /AOV|Ticket/i,
  },
  {
    term: "CTR",
    text: "Porcentaje de personas que hacen clic en el anuncio. Mide si el creativo atrae (sano: 1,2% o más).",
    re: /CTR/,
  },
  {
    term: "CPC",
    text: "Costo por clic: gasto en anuncios ÷ clics.",
    re: /CPC/,
  },
  {
    term: "Conversión",
    text: "Pedidos ÷ clics. Mide si la página y la oferta convencen (sano: 1,5% o más).",
    re: /Conversión/,
  },
  {
    term: "% de confirmación",
    text: "Pedidos que el cliente confirma por WhatsApp o llamada antes de despachar. Los no confirmados no se envían.",
    re: /confirmación/i,
  },
  {
    term: "% de entrega",
    text: "Pedidos despachados que el cliente recibe y paga. El resto vuelve y pierdes el flete.",
    re: /entrega/i,
  },
  {
    term: "Utilidad por pedido",
    text: "Lo que te deja cada pedido antes de publicidad. Es el CPA máximo que puedes pagar.",
    re: /Utilidad por pedido|CPA máximo/i,
  },
  {
    term: "Margen de contribución",
    text: "Lo que queda de las ventas después de producto, fletes, devoluciones y comisiones, antes de la publicidad.",
    re: /contribución/i,
  },
  {
    term: "Margen neto",
    text: "Lo que queda de las ventas después de TODO, incluida la publicidad y los fijos. Es lo que puedes reinvertir.",
    re: /Margen neto/i,
  },
  {
    term: "Precio de equilibrio",
    text: "El precio en el que no ganas ni pierdes.",
    re: /equilibrio/i,
  },
  {
    term: "Puntaje y clase",
    text: "Evaluación inicial del producto de 0 a 100. A = testear ya, B = testear si no hay A, C = no testear.",
    re: /Puntaje|Clase/,
  },
  {
    term: "Upsell",
    text: "Oferta adicional que se agrega al pedido (un complemento o una segunda unidad).",
    re: /upsell/i,
  },
  {
    term: "Downsell",
    text: "Oferta más barata o con descuento para el cliente que duda o rechaza, para no perder la venta.",
    re: /downsell/i,
  },
  {
    term: "Cross-sell",
    text: "Venta de un producto relacionado después de la compra (recompra), sin pagar publicidad.",
    re: /cross-sell/i,
  },
  {
    term: "Order bump",
    text: "Complemento barato que se marca en el mismo formulario de compra.",
    re: /order bump/i,
  },
  {
    term: "Contraentrega (COD)",
    text: "El cliente paga al recibir. Tú pagas la publicidad antes; Dropi te liquida después de la entrega.",
    re: /contraentrega/i,
  },
  {
    term: "Interés compuesto",
    text: "Reinvertir parte de la utilidad para que la pauta y las ganancias crezcan sobre lo ya ganado.",
    re: /compuest|Patrimonio/i,
  },
  {
    term: "Fondo de aprendizaje",
    text: "Dinero que separas para testear productos y das por gastado. Cada test fallido es información.",
    re: /aprendizaje/i,
  },
];

export function tipFor(title: string): GlossaryTerm | null {
  return GLOS.find((g) => g.re.test(title)) ?? null;
}
