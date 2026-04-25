# Capy Retouching

Editor fotográfico avançado, não destrutivo e local-first para navegador moderno.

## Stack

- React + TypeScript + Vite
- CSS responsivo com arquitetura mobile-first
- Canvas 2D para fallback universal
- Web Worker para processamento pesado no preview/export
- IndexedDB para salvar projetos locais
- Estado central não destrutivo via React Context + reducer

## Rodar localmente

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
npm run preview
```

## Funcionalidades implementadas

- Importação local: JPEG, PNG, WebP e AVIF quando o navegador suportar.
- Preview em Canvas com zoom, pan, fit, antes/depois.
- Estado `EditState` preserva original e ajustes.
- Ajustes globais: exposição, contraste, realces, sombras, brancos, pretos, temperatura, matiz, vibrance, saturação, claridade, dehaze, nitidez, redução de ruído, vinheta e grão.
- Curvas RGB simplificadas por sombras, médios e altas luzes.
- HSL por cor: red, orange, yellow, green, aqua, blue, purple, magenta.
- Crop, rotação 90°, flip horizontal/vertical.
- Presets embutidos.
- Reset, undo/redo.
- Máscaras locais: linear, radial e pincel em estrutura inicial. O pincel já existe no modelo e pipeline, mas a pintura direta no canvas fica no roadmap imediato.
- Exportação JPEG, PNG e WebP com qualidade e lado máximo.
- Histograma RGB/luma em tempo real no preview.
- Salvamento de projeto em IndexedDB e exportação `.json`.
- UI desktop com painéis esquerdo/direito e mobile com bottom sheet.

## Limitações reais do MVP

- O pipeline usa Canvas 2D. É confiável e compatível, mas filtros complexos em imagem gigante podem ficar lentos em celulares.
- RAW não foi prometido como suporte inicial. RAW no navegador exige WASM e bibliotecas específicas, com custo alto de bundle, memória e compatibilidade.
- Máscara de pincel tem modelo e renderização, mas a ferramenta de desenho direto no canvas ainda precisa de uma camada de input dedicada.
- Claridade, dehaze, vibrance e denoise são aproximações computacionais leves, não equivalentes aos algoritmos proprietários de editores comerciais.
- EXIF completo não foi incluído por padrão para manter o bundle leve. O módulo está separado para receber `exifr` ou alternativa leve depois.

## Estrutura

```txt
src/
  app/
  components/
    editor/
    panels/
    sliders/
    canvas/
    mobile/
  core/
    image/
    pipeline/
    adjustments/
    masks/
    color/
    export/
    history/
    performance/
    storage/
  workers/
  store/
  hooks/
  utils/
  types/
```
