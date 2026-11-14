# Compila el informe y la presentación, y arma el zip para Overleaf.
# Necesita tectonic y zip. En Overleaf basta con subir entregas/informe_overleaf.zip.

INFORME := informe
ZIP     := entregas/informe_overleaf.zip
FIGURAS := $(wildcard $(INFORME)/figuras/*.tex $(INFORME)/figuras/datos/*.dat \
                      $(INFORME)/figuras/fotos/* $(INFORME)/Imagenes/*)

.PHONY: todo informe slides zip limpiar

todo: informe slides zip

informe: $(INFORME)/main.pdf $(INFORME)/main.human.pdf
slides: $(INFORME)/slides.pdf
zip: $(ZIP)

$(INFORME)/%.pdf: $(INFORME)/%.tex $(FIGURAS)
	cd $(INFORME) && tectonic $*.tex

$(ZIP): $(INFORME)/main.tex $(INFORME)/main.human.tex $(INFORME)/slides.tex $(INFORME)/LEEME.txt $(FIGURAS)
	@mkdir -p $(dir $@)
	rm -f $@
	cd $(INFORME) && zip -qr ../$@ main.tex main.human.tex slides.tex LEEME.txt figuras Imagenes -x '*.gitkeep'
	@echo "Listo: $@"

limpiar:
	rm -f $(INFORME)/*.aux $(INFORME)/*.log $(INFORME)/*.out $(INFORME)/*.nav \
	      $(INFORME)/*.snm $(INFORME)/*.toc $(INFORME)/*.vrb $(ZIP)
