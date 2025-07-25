# Como Atualizar um Fork com as Mudanças do Repositório Original

Este guia mostra o passo a passo para manter seu fork atualizado com o repositório original no GitHub.

---

## ✅ Verificar e Adicionar o Repositório Original (Upstream)

### 1. Listar remotes existentes

```bash
git remote -v
```

Saída esperada:

```
origin    https://github.com/seu-usuario/seu-fork.git (fetch)
origin    https://github.com/seu-usuario/seu-fork.git (push)
```

### 2. Adicionar o repositório original como remoto (se necessário)

```bash
git remote add upstream https://github.com/usuario-original/repositorio-original.git
```

Verifique novamente:

```bash
git remote -v
```

Você deverá ver:

```
origin    https://github.com/seu-usuario/seu-fork.git (fetch)
origin    https://github.com/seu-usuario/seu-fork.git (push)
upstream  https://github.com/usuario-original/repositorio-original.git (fetch)
upstream  https://github.com/usuario-original/repositorio-original.git (push)
```

---

## 🔄 Buscar e Mesclar as Atualizações do Repositório Original

### 3. Buscar atualizações do repositório original (upstream)

```bash
git fetch upstream
```

### 4. Ir para a branch principal do seu fork

```bash
git checkout main
```

### 5. Mesclar as atualizações do repositório original

Se a branch principal do original for `main`:

```bash
git merge upstream/main
```

Se for `master`, use:

```bash
git merge upstream/master
```

### 6. Resolver conflitos (se houver)

Se houver conflitos:
- Edite os arquivos conflitantes.
- Marque-os como resolvidos:

```bash
git add .
```

- Finalize o merge:

```bash
git commit
```

---

## 🚀 Enviar as Atualizações para o seu Fork no GitHub

### 7. Fazer push da branch atualizada para o seu fork

```bash
git push origin main
```

---

## 🔍 Resumo Rápido

| Comando                              | O que faz |
|--------------------------------------|------------|
| `git remote add upstream <url>`      | Adiciona o repositório original |
| `git fetch upstream`                 | Busca as mudanças do original |
| `git merge upstream/main`            | Mescla no seu fork |
| `git push origin main`               | Atualiza seu fork no GitHub |

---

## 🔧 Alternativas

- Se quiser manter o histórico limpo: `git rebase upstream/main`
- Também é possível automatizar esse fluxo usando GitHub Actions ou GitHub CLI.

---

Pronto! Agora seu fork está atualizado com o repositório original.
