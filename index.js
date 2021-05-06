let steam = require('steam-user');
const axios = require('axios');

let user = new steam();


const prompt = require('prompt');

const properties = [
    {
        name: 'username',
    },
    {
        name: 'password',
        hidden: true
    }
];

prompt.start();

prompt.get(properties, function (err, result) {
    if (err) { return onErr(err); }
    let logOnCreditentials = {
        accountName: result.username,
        password: result.password
    }
    start(logOnCreditentials)
});

function onErr(err) {
    console.log(err);
    return 1;
}





let userUrlBadges = "";
let numberOfPage = 1;
let games = [];


user.on('loggedOn', async (userLogged) => {
    userUrlBadges = 'https://steamcommunity.com/id/' + userLogged.vanity_url + '/badges/?p=';
})

user.on('webSession', async (websession, cookies) => {
    let totalPages = await firstRequestTotalPages(cookies);
    let i = 1;

    while (i <= totalPages) {
        await axios.get(userUrlBadges + i, {withCredentials: true})
            .then(async (response) => {
                if (response.status === 200) {
                    console.log('PAGE - ' + i)
                    const html = response.data;
                    await getGamesToLaunch(html);
                }
            })
            .catch((err) => {
                throw new Error(err);
            });
        ++i;
    }
    console.log(games);
    startGame();
})

function start(credentials){
    user.logOn(credentials);
}

async function firstRequestTotalPages(cookies) {
    axios.defaults.headers.Cookie = cookies;
    await axios.get(userUrlBadges + '1', {withCredentials: true})
        .then(async (response) => {
            if (response.status === 200) {
                const html = response.data;
                await getNumbersOfPage(html);
            }
        })
        .catch((err) => {
            throw new Error(err);
        });
    return numberOfPage;
}

async function getGamesToLaunch(str) {
    const regex = /steam:\/\/run\/(.*)">/gm;
    let m;
    while ((m = regex.exec(str)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        m.forEach((match, groupIndex) => {
            if(groupIndex === 1) {
                games.push(parseInt(match));
            }
        });
    }
}

async function getNumbersOfPage(str) {
    const regex = /Showing (.*) of (.*) badges/gm;
    let m;
    while ((m = regex.exec(str)) !== null) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        m.forEach((match, groupIndex) => {
            if (groupIndex === 2) {
                numberOfPage = Math.ceil(match / 150)
            }
            console.log(`Found match, group ${groupIndex}: ${match}`);
        });
    }
    return numberOfPage;
}

function startGame() {
    user.setPersona(0)
    user.gamesPlayed(games);
}