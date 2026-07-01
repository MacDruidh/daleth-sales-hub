from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = [
    ROOT / "public" / "Manual_do_Usuario_Daleth_Sales_Hub.pdf",
    ROOT / "dist" / "Manual_do_Usuario_Daleth_Sales_Hub.pdf",
    ROOT / "output" / "pdf" / "Manual_do_Usuario_Daleth_Sales_Hub.pdf",
]


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverTitle",
    parent=styles["Title"],
    fontName="Helvetica-Bold",
    fontSize=30,
    leading=36,
    textColor=colors.HexColor("#061b34"),
    spaceAfter=16,
))
styles.add(ParagraphStyle(
    name="CoverSubtitle",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=13,
    leading=19,
    textColor=colors.HexColor("#475569"),
    alignment=1,
))
styles.add(ParagraphStyle(
    name="Heading",
    parent=styles["Heading1"],
    fontName="Helvetica-Bold",
    fontSize=17,
    leading=22,
    textColor=colors.HexColor("#061b34"),
    spaceBefore=8,
    spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="Body",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=9.7,
    leading=14,
    textColor=colors.HexColor("#1f2937"),
    spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="Small",
    parent=styles["BodyText"],
    fontName="Helvetica",
    fontSize=8.5,
    leading=12,
    textColor=colors.HexColor("#64748b"),
))
styles.add(ParagraphStyle(
    name="ManualBullet",
    parent=styles["Body"],
    leftIndent=12,
    firstLineIndent=-7,
))


def p(text, style="Body"):
    return Paragraph(text, styles[style])


def bullet(text):
    return p(f"- {text}", "ManualBullet")


def table(rows, widths=None):
    data = [[p(str(cell), "Body") for cell in row] for row in rows]
    tbl = Table(data, colWidths=widths, hAlign="LEFT")
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eaf6fb")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#061b34")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("GRID", (0, 0), (-1, -1), 0.45, colors.HexColor("#d7e8f5")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return tbl


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8.5)
    canvas.setFillColor(colors.HexColor("#64748b"))
    if doc.page > 1:
        canvas.drawString(2 * cm, A4[1] - 1.35 * cm, "Daleth Sales Hub - Manual do Usuario")
        canvas.drawRightString(A4[0] - 2 * cm, A4[1] - 1.35 * cm, f"Pagina {doc.page}")
    canvas.restoreState()


def build_story():
    story = []
    story.append(Spacer(1, 4.3 * cm))
    story.append(p("Manual do Usuario<br/>Daleth Sales Hub", "CoverTitle"))
    story.append(p(
        "Guia pratico para operacao comercial mensal, pipeline, oportunidades, contratos, "
        "atividades, documentos, mencoes e indicadores.",
        "CoverSubtitle",
    ))
    story.append(Spacer(1, 0.8 * cm))
    story.append(p(
        "Versao atualizada: 01/07/2026. Inclui Menções para mim, sincronizacao prudente das listas principais, assinatura de calendario externo, exclusao de atividades, cadastro de motivos de perda, multiplos produtos por oportunidade e edicao do historico.",
        "CoverSubtitle",
    ))
    story.append(Spacer(1, 5.2 * cm))
    story.append(p("Daleth AC - Customer Acquisition Platform", "CoverSubtitle"))
    story.append(PageBreak())

    sections = [
        "1. Visao geral mensal",
        "2. Perfis de acesso e navegacao",
        "3. Dashboard",
        "4. Insights Daleth",
        "5. Funil Comercial Aprimorado",
        "6. Painel de Pendencias",
        "7. Mencoes e trabalho em equipe",
        "8. Qualidade do CRM",
        "9. Pipeline",
        "10. Cadastros",
        "11. Oportunidades",
        "12. Contratos",
        "13. Atividades e calendario",
        "14. Documentos",
        "15. Busca, importacao e boas praticas",
        "16. Rotina sugerida",
    ]
    story.append(p("Indice", "Heading"))
    for item in sections:
        story.append(p(item, "Body"))
    story.append(PageBreak())

    story.append(p("1. Visao geral mensal", "Heading"))
    story.append(p("O Daleth Sales Hub e o CRM comercial da Daleth AC. A visao gerencial principal do sistema e mensal: o primeiro numero a observar e quanto cada oportunidade ou contrato representa por mes."))
    story.append(p("O valor total do contrato continua disponivel, mas como apoio para negociacao, contrato e analise de longo prazo. Para gestao diaria, metas e leitura imediata da empresa, use receita mensal."))
    story.append(table([
        ["Metrica", "Uso recomendado"],
        ["Receita mensal", "Principal leitura comercial. Mostra quanto a oportunidade ou contrato representa por mes."],
        ["Previsao mensal ponderada", "Receita mensal ajustada pela probabilidade da etapa. Ajuda a estimar fechamento realista."],
        ["Receita anualizada", "Receita mensal multiplicada por 12. Boa para leitura de escala anual."],
        ["Contrato total", "Receita mensal x prazo contratual + implantacao. Use como informacao complementar."],
    ], [5 * cm, 10.7 * cm]))
    story.append(Spacer(1, 6))
    story.append(p("Regra de ouro: para decidir prioridade comercial, olhe primeiro para receita mensal, etapa, interacao recente e proximo passo."))

    story.append(p("2. Perfis de acesso e navegacao", "Heading"))
    story.append(p("O CRM trabalha com perfis de acesso. Algumas areas aparecem apenas para usuarios autorizados."))
    story.append(table([
        ["Perfil", "Uso principal"],
        ["CEO", "Acesso amplo, incluindo Dashboard, Importacao, Perfis e configuracoes administrativas."],
        ["Comercial", "Uso comercial diario: oportunidades, atividades, pipeline, contratos, documentos e cadastros."],
        ["Reserva", "Perfil limitado ou contingencial, conforme configuracao do CRM."],
    ], [4 * cm, 11.7 * cm]))
    for item in [
        "Dashboard: visao executiva mensal e indicadores gerais.",
        "Insights Daleth: analises por responsavel, produto, segmento, risco e contratos.",
        "Funil Comercial: desempenho por etapa com receita mensal e previsao mensal.",
        "Pendencias: itens que exigem acao comercial, incluindo mencoes para o usuario logado.",
        "Qualidade do CRM: cadastros incompletos e possiveis duplicidades.",
        "Pipeline: kanban das oportunidades por etapa.",
        "Cadastros: empresas, contatos e produtos.",
    ]:
        story.append(bullet(item))

    story.append(PageBreak())
    story.append(p("3. Dashboard", "Heading"))
    for item in [
        "Receita mensal contratada mostra a base mensal ativa.",
        "Pipeline mensal mostra a soma mensal das oportunidades abertas.",
        "Previsao mensal ponderada mostra o pipeline mensal ajustado pela probabilidade de fechamento.",
        "Pipeline por etapa e por segmento mostram receita mensal, nao valor total do contrato.",
        "Top oportunidades e oportunidades sem contato tambem usam receita mensal como valor principal.",
    ]:
        story.append(bullet(item))
    story.append(p("Use o Dashboard para responder: quanto temos contratado por mes, quanto existe de potencial mensal e onde estao os riscos comerciais."))

    story.append(p("4. Insights Daleth", "Heading"))
    for item in [
        "Pipeline mensal aberto: soma mensal das oportunidades abertas dentro do filtro.",
        "Previsao mensal ponderada: receita mensal x probabilidade da etapa.",
        "Receita mensal ganha e perdida: leitura mensal das oportunidades finalizadas.",
        "Desempenho por responsavel, produto e segmento mostra pipeline mensal e previsao mensal.",
        "Ao clicar em uma linha, o Detalhe do insight abre as oportunidades correspondentes em receita mensal.",
    ]:
        story.append(bullet(item))
    story.append(table([
        ["Filtro", "Como usar"],
        ["Periodo", "Todos, este mes, proximos 90 dias ou fechamento vencido."],
        ["Responsavel", "Analisa carteira por pessoa."],
        ["Produto", "Mostra potencial mensal por solucao."],
        ["Segmento", "Mostra potencial mensal por mercado."],
    ], [4 * cm, 11.7 * cm]))

    story.append(p("5. Funil Comercial Aprimorado", "Heading"))
    for item in [
        "Pipeline mensal aberto mostra a soma mensal das oportunidades abertas.",
        "Previsao mensal ponderada mostra o potencial mensal com probabilidade aplicada.",
        "Desempenho por etapa mostra receita mensal, previsao mensal, conversao e tempo medio.",
        "O botao Ver oportunidades abre a lista de oportunidades naquela etapa, tambem em receita mensal.",
    ]:
        story.append(bullet(item))
    story.append(p("Conversao e tempo medio dependem do historico de mudanca de etapa. Eles ficam melhores conforme o time movimenta as oportunidades corretamente."))

    story.append(PageBreak())
    story.append(p("6. Painel de Pendencias", "Heading"))
    story.append(p("O Painel de Pendencias organiza o que exige acao imediata. As oportunidades exibidas nessa tela mostram receita mensal, pois o foco e priorizacao comercial."))
    story.append(table([
        ["Bloco", "O que mostra"],
        ["Atividades vencidas", "Atividades pendentes com data anterior ao dia atual."],
        ["Propostas sem follow-up", "Oportunidades em Proposta Enviada sem atividade futura, com receita mensal."],
        ["Reunioes de hoje", "Atividades do tipo reuniao previstas para hoje."],
        ["Contratos vencendo em 90 dias", "Contratos ativos proximos do fim, com receita mensal."],
        ["Oportunidades sem proximo passo", "Negocios abertos sem orientacao clara, com receita mensal."],
        ["Mencoes para mim", "Registros em que o usuario logado foi citado com @Nome."],
    ], [5.2 * cm, 10.5 * cm]))

    story.append(p("7. Mencoes e trabalho em equipe", "Heading"))
    story.append(p("As mencoes ajudam o time a chamar a atencao de um responsavel dentro do proprio CRM. Ao digitar @ em campos de texto, o sistema mostra a lista de usuarios para selecao."))
    for item in [
        "Use @Paulo, @Katia, @Oyas, @Sergio Paulo ou @Reserva em atividades, reunioes, historico, interacoes, descricoes e observacoes.",
        "Campos de e-mail, site, telefone, WhatsApp, LinkedIn e links nao exibem sugestoes de mencao.",
        "Quem foi citado deve abrir Pendencias e consultar o bloco Mencoes para mim.",
        "O sininho de Alertas comerciais tambem soma as mencoes pendentes do usuario logado.",
        "Ao clicar em uma mencao, o CRM abre a oportunidade ou atividade correspondente.",
    ]:
        story.append(bullet(item))
    story.append(p("Exemplo pratico: em uma atividade, escreva \"@Paulo favor validar o proximo follow-up com a Fast Escova\". Paulo vera essa citacao em Menções para mim."))

    story.append(PageBreak())
    story.append(p("8. Qualidade do CRM", "Heading"))
    for item in [
        "Oportunidades sem empresa, responsavel, produto ou proximo passo.",
        "Empresas sem segmento cadastrado.",
        "Contatos sem empresa vinculada.",
        "Possiveis empresas duplicadas por nome, CNPJ ou site.",
        "Ao corrigir uma oportunidade pela Qualidade, salve e retorne para a lista de pendencias cadastrais.",
    ]:
        story.append(bullet(item))

    story.append(p("9. Pipeline", "Heading"))
    for item in [
        "Abaixo do nome da etapa aparece a soma da receita mensal daquela etapa.",
        "Cada card mostra a receita mensal da oportunidade.",
        "Clique no card para abrir a oportunidade.",
        "Use o seletor do card para mover a oportunidade de etapa.",
        "Ao clicar no nome da etapa, aparece a lista de oportunidades daquela etapa.",
    ]:
        story.append(bullet(item))

    story.append(p("10. Cadastros", "Heading"))
    for item in [
        "Empresas: cadastre nome fantasia, segmento, site e CNPJ.",
        "Segmentos podem ser escolhidos de uma lista e novos segmentos ficam salvos para uso futuro.",
        "Contatos devem ser vinculados a empresas sempre que possivel.",
        "Produtos cadastrados ficam disponiveis em oportunidades e contratos.",
        "Motivos de Perda cadastra as opcoes usadas quando uma oportunidade estiver na etapa Perdido.",
    ]:
        story.append(bullet(item))

    story.append(PageBreak())
    story.append(p("11. Oportunidades", "Heading"))
    for item in [
        "Receita mensal filtrada: soma mensal das oportunidades abertas dentro dos filtros.",
        "Previsao mensal ponderada: receita mensal ajustada pela probabilidade da etapa.",
        "Oportunidades abertas: quantidade de negocios abertos no filtro.",
        "Contrato total filtrado: valor total dos contratos como apoio, nao como metrica principal.",
        "Na tabela, Receita mensal aparece com destaque. Contrato total fica como complemento.",
    ]:
        story.append(bullet(item))
    story.append(p("Ficha da oportunidade", "Heading"))
    for item in [
        "A aba Dados permite editar informacoes comerciais.",
        "Cada oportunidade pode ter ate tres produtos vinculados: Produto 1, Produto 2 e Produto 3.",
        "Historico registra interacoes e anotacoes; interacoes registradas podem ser editadas pela propria linha do tempo.",
        "Atividades mostra compromissos e follow-ups vinculados.",
        "Documentos permite anexar links de arquivos.",
        "Contrato e Matriz trazem resumo comercial e sugestoes de solucoes.",
        "Campos de texto aceitam mencoes com @ para acionar outro usuario.",
        "Quando a etapa for Perdido, escolha o Motivo da perda a partir da lista mantida em Cadastros.",
    ]:
        story.append(bullet(item))

    story.append(p("12. Contratos", "Heading"))
    for item in [
        "Use Novo contrato para cadastrar cliente, produto, inicio, prazo, receita mensal, implantacao e responsavel.",
        "O termino do contrato e calculado a partir da data de inicio e prazo contratual.",
        "Contratos vencendo em 90 dias ajudam a planejar renovacao.",
        "A carteira ativa por cliente mostra concentracao mensal contratada.",
    ]:
        story.append(bullet(item))

    story.append(PageBreak())
    story.append(p("13. Atividades e calendario", "Heading"))
    for item in [
        "No calendario, clique em uma data para cadastrar atividade com oportunidade, data, hora e link de reuniao.",
        "Atividades podem ficar Pendentes ou Concluidas.",
        "Atividades vencidas aparecem em Pendencias, Dashboard e Insights.",
        "Use @Nome nas observacoes de uma atividade ou reuniao para citar alguem do time.",
        "Para uma atividade cadastrada por engano, abra a atividade e use Excluir atividade. Ela sai do CRM e tambem deixa de aparecer no calendario externo depois da proxima atualizacao da assinatura.",
        "Use Assinar calendario externo para copiar o link e assinar as atividades no Apple Calendar ou Outlook.",
        "O link Meu calendario filtra pelo usuario logado; Todos os responsaveis mostra a agenda geral do CRM.",
    ]:
        story.append(bullet(item))

    story.append(p("14. Documentos", "Heading"))
    story.append(p("Documentos guarda links compartilhados de arquivos. Usuarios podem acessar links compartilhados sem conta propria no Dropbox, desde que o link esteja liberado."))
    for item in [
        "Cadastre nome do arquivo, link compartilhado, categoria, responsavel e observacoes.",
        "Vincule o documento a empresa e/ou oportunidade quando fizer sentido.",
    ]:
        story.append(bullet(item))

    story.append(p("15. Busca, importacao e boas praticas", "Heading"))
    story.append(p("Busca global: a busca no topo localiza empresas, contatos, oportunidades, contratos, produtos e atividades. O resultado de oportunidades mostra receita mensal."))
    story.append(p("Importacao Pipedrive e Perfis sao areas administrativas. Alteracoes devem ser feitas com cuidado."))
    for item in [
        "Toda oportunidade deve ter empresa, produto, responsavel e proximo passo.",
        "Registre interacoes relevantes logo depois de ligacoes, reunioes ou conversas por WhatsApp.",
        "Crie sempre uma proxima atividade quando enviar proposta.",
        "Use @Nome quando uma acao depender de outra pessoa do time.",
        "Mantenha segmento da empresa preenchido.",
        "Use Pendencias e Qualidade do CRM como rotina de higiene comercial.",
        "Para priorizacao, olhe receita mensal antes de contrato total.",
    ]:
        story.append(bullet(item))

    story.append(PageBreak())
    story.append(p("16. Rotina sugerida", "Heading"))
    story.append(table([
        ["Momento", "Acao recomendada"],
        ["Inicio do dia", "Abrir Pendencias e verificar atividades vencidas, reunioes, propostas sem follow-up e Menções para mim."],
        ["Durante o dia", "Atualizar oportunidades, registrar interacoes, criar proximas atividades e citar usuarios quando houver dependencia."],
        ["Fim do dia", "Revisar Pipeline, receita mensal por etapa e oportunidades sem proximo passo."],
        ["Semanalmente", "Analisar Insights por responsavel, produto e segmento."],
        ["Mensalmente", "Revisar Dashboard, Funil Comercial, contratos vencendo e receita mensal contratada."],
    ], [4.2 * cm, 11.5 * cm]))
    story.append(Spacer(1, 10))
    story.append(p("Este manual deve acompanhar a evolucao do Daleth Sales Hub. Ao adicionar novas funcionalidades, atualize a secao correspondente."))

    return story


def generate(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(path),
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2.1 * cm,
        bottomMargin=1.8 * cm,
        title="Manual do Usuario - Daleth Sales Hub",
        author="Daleth AC",
    )
    doc.build(build_story(), onFirstPage=header_footer, onLaterPages=header_footer)


if __name__ == "__main__":
    for output in OUTPUTS:
        generate(output)
        print(output)
