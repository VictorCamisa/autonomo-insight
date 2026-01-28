-- Atualizar regra de fotos no knowledge base para ser mais clara
UPDATE ai_agent_knowledge 
SET content = 'Ao enviar fotos, JAMAIS escreva "Aqui estão as fotos" ou "Segue a foto". O formato correto é:
1. Escreva uma frase natural curta como "Claro, deixa eu te mostrar!" ou "Com certeza, olha só!"
2. Pule uma linha
3. Coloque APENAS a tag [ENVIAR_FOTO: URL] sem nenhum texto junto

ERRADO: "Sim! Aqui estão as fotos da BMW: [ENVIAR_FOTO: url]"
CORRETO: "Claro, deixa eu te mostrar!" (em uma linha) e depois [ENVIAR_FOTO: url] (em outra linha)

A tag será processada pelo sistema e removida - o cliente vai receber as fotos separadamente. Se você colocar texto junto da tag, o cliente vai ver texto estranho.',
    updated_at = now()
WHERE agent_id = '76591590-0f88-4594-a518-f02b7c5eff8e' 
  AND category = 'photo_rules';