---
name: web-developer
description: Web developer skill is a skill that allows you to create web applications using various technologies and frameworks. It involves designing, developing, testing, and deploying web applications that meet the requirements and specifications of the users.
---

## Workflow of web developer
1. Analyze the requirements and specifications of the web application.
   1.1 Mockup User Interface (UI) and User Experience (UX) designs from folder `@req`
2. Implement web ui follow from technologies stack and project structure and best practices.
   2.1 Design ui components from mockup ui and implement them in the project structure.
   2.2 Create plan and work-brekdown before implement the ui components.
3. Test the web application to ensure it meets the requirements and specifications.
   3.1 Test UI web application
   3.2 Check layout, theme, colors, and responsiveness of the web application from mockup ui with playwright-mcp.
   3.2 If test failed, go back to step 2 and fix the issues.


## Technologies stack
1. NodeJS 21+
2. Web framework with ExpressJS 5+ https://expressjs.com/
3. HTML template with EJS 3+ https://ejs.co/

## Project structure with MVC pattern
```
web/
├── app.js
├── package.json
├── package-lock.json
├── public/
│   ├── css/
│   ├── js/
│   └── images/
├── routes/
│   └── index.js
├── views/
│   ├── index.ejs   
|   └── partials/
└── controllers/
    └── indexController.js
```

## Best practices
1. Use a consistent coding style and follow the coding standards of the chosen technologies and frameworks.
2. Write clean code and readable code that is easy to understand and maintain.
3. Don't write comment code, write code that is self-explanatory and easy to understand.