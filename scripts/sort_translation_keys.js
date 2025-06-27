import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const sortJson = (json) => {
    return Object.keys(json)
        .sort()
        .reduce((acc, key) => {
            let value = json[key];
            if (typeof value === 'object') {
                value = sortJson(value);
            }
            acc[key] = value;
            return acc;
        }, {});
};

export function sortJsonFile(filePath) {
    const data = readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);

    return sortJson(json)
}

const locales = ['en', 'nb'];

// Ensures this only runs when sort-translations runs, not when vitest is testing i18n.test.ts
if (process.argv[2] === 'sort') {
    locales.forEach((locale) => {
        const filePath = join('public', 'translations', `${ locale }.json`)
        const sorted = sortJsonFile(filePath);

        writeFileSync(filePath, JSON.stringify(sorted, null, 2), 'utf8');
    });
}