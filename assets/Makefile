# Makefile for assets

PYTHON=python
SOX=sox
LAME=lame

AUDIOS=change.mp3 door.mp3 exit.mp3 jump.mp3 notice.mp3 shoot.mp3 hurt.mp3

all: $(AUDIOS)

clean:
	-$(RM) $(AUDIOS)

.SUFFIXES: .png .wav .mp3

.wav.mp3:
	$(SOX) $< -t wav - pad 0 0.5 | $(LAME) - $@
