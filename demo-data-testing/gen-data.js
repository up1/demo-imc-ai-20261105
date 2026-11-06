const fs = require('node:fs');
const path = require('node:path');
const { faker } = require('@faker-js/faker');

const employeeCount = 1000;
const headers = [
  'Employee ID',
  'First Name',
  'Last Name',
  'Email',
  'Credit Card Number',
];

function escapeCsv(value) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const rows = Array.from({ length: employeeCount }, (_, index) => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return [
    index + 1,
    firstName,
    lastName,
    faker.internet.email({ firstName, lastName }),
    faker.string.numeric(16),
  ];
});

const csv = [headers, ...rows]
  .map((row) => row.map(escapeCsv).join(','))
  .join('\n');

const outputPath = path.join(__dirname, 'employees.csv');
fs.writeFileSync(outputPath, `${csv}\n`, 'utf8');
console.log(`Generated ${employeeCount} employees in ${outputPath}`);