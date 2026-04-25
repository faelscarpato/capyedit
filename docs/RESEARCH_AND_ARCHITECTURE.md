# Capy Retouching — Pesquisa, arquitetura e decisões

## Pesquisa técnica resumida

### Suportado agora no MVP

- **Canvas 2D**: base de renderização e manipulação de pixels. Usado para preview, filtros e exportação por `toBlob`.
- **createImageBitmap**: decodificação eficiente de imagens locais e respeito à orientação quando suportado.
- **Web Workers**: processamento de pixel em thread separada para reduzir travamento de UI.
- **IndexedDB**: persistência local de projetos e estados de edição.
- **JPEG/PNG/WebP/AVIF**: aceitos via input. AVIF depende do navegador.

Referências consultadas:

- https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob
- https://developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
- https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types

### Experimental ou dependente do navegador

- **WebGPU**: excelente para filtros em tempo real, mas ainda deve ser tratado como aceleração opcional com fallback.
- **WebCodecs/ImageDecoder**: interessante para decodificação avançada, mas ainda não deve ser requisito do MVP.
- **OffscreenCanvas em worker**: bom caminho para tirar renderização do main thread, mas a disponibilidade e integração variam por ambiente.

Referências:

- https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API
- https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas

### Roadmap futuro

- WebGL/WebGPU shader pipeline para sliders em tempo real.
- LUTs `.cube`.
- EXIF completo com biblioteca leve.
- RAW via WASM, somente após prova de viabilidade por dispositivo.
- Healing/clone com buffers locais.
- Segmentação local de sujeito, somente com modelo leve e opcional.

## Arquitetura

A UI não manipula pixels diretamente. Ela altera `EditState`. O motor recebe a imagem original e o estado, gera preview e exporta uma versão final.

```txt
Imagem original
  → preview otimizado
  → crop/rotação/flip
  → ajustes globais
  → máscaras locais
  → detalhe/grão/vinheta
  → canvas preview ou blob de exportação
```

## Por que Canvas 2D primeiro

Canvas 2D é o fallback mais previsível para navegadores modernos. Ele entrega importação, preview e exportação sem backend obrigatório. O MVP prioriza compatibilidade e manutenção antes de GPU.

## Quando usar Worker

O worker é usado quando o app precisa percorrer pixels. Isso evita congelar React durante exportação ou previews mais pesados. Para imagens grandes, o preview usa lado máximo reduzido, e a exportação aceita `maxEdge`.

## Como evitar travamentos

- Preview reduzido em tempo de edição.
- Render final só na exportação.
- Histórico limitado a 80 estados.
- Workers para processamento pesado.
- Avisos de megapixels/memória.
- Pipeline puro fora dos componentes React.

## Preservação do original

A imagem importada fica em `LoadedImage`. Sliders alteram apenas `EditState`. A cada render, os pixels são recalculados a partir do bitmap original, não a partir da imagem editada anterior.
