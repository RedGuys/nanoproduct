# Тестовое задание для Нанопродукт

## Установка и запуск
### Docker Compose
Для удобства я подготовил docker-compose файл, который запустит приложение и MongoDB

```bash
docker compose up
```

### Ручной запуск
Для работы вам необходим MongoDB

Пропишите адресс MongoDB сервера в переменной среды MONGO_URL

```bash
npm i && npm run dev
```

## Примечания
Дополнительно добавил Insomnia.json в котором присутствуют все запросы к API с примерами, для открытия используйте приложение Insomnia

[![Run in Insomnia}](https://insomnia.rest/images/run.svg)](https://insomnia.rest/run/?label=NanoProduct&uri=https%3A%2F%2Fgithub.com%2FRedGuys%2Fnanoproduct%2FInsomnia.json)