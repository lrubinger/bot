## Primeira instalação

```bash
git clone https://github.com/lrubinger/bot.git bot
cd bot/installer
cp config.example config
chmod +x install_primaria install_instancia
sudo ./install_primaria
```

O instalador solicitará o endereço do repositório. Use
`https://github.com/lrubinger/bot.git`.

## Instalações adicionais

```bash
cd bot/installer
sudo ./install_instancia
```

O arquivo `config` contém senhas e está ignorado pelo Git. Não o publique.
