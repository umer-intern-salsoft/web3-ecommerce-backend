import fs from 'node:fs';

export default function loadSslCredentials() {
    const key = fs.readFileSync('/etc/apache2/ssl/onlinetestingserver.key', 'utf8');
    const cert = fs.readFileSync('/etc/apache2/ssl/onlinetestingserver.crt', 'utf8');
    const ca = fs.readFileSync('/etc/apache2/ssl/onlinetestingserver.ca');
    return { key, cert, ca };
}