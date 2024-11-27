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
    },
    {
        name: 'delay'
    }

];

prompt.start();

let delay = 60000;

prompt.get(properties, function (err, result) {
    if (err) { return onErr(err); }
    let logOnCreditentials = {
        accountName: result.username,
        password: result.password
    }
    delay = result.delay;
    start(logOnCreditentials)
});

function onErr(err) {
    console.log(err);
    return 1;
}





let userUrlBadges = "";
let numberOfPage = 1;
let games = [];


let userCookies = null;


user.on('loggedOn', async (userLogged) => {
    userUrlBadges = 'https://steamcommunity.com/id/' + userLogged.vanity_url + '/badges/?p=';
})

user.on('webSession', async (websession, cookies) => {
    userCookies = cookies;
    await prestart()
})

async function prestart() {
    let totalPages = await firstRequestTotalPages(userCookies);
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
}

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
                numberOfPage = Math.ceil(parseInt(match) / 150)
            }
            console.log(`Found match, group ${groupIndex}: ${match}`);
        });
    }
    return numberOfPage;
}

function startGame() {
    let totalNumberOfGames = games.length;
    console.log('Games to farm : ' + totalNumberOfGames)
    if(totalNumberOfGames < 1){
        console.log('Not enough games to farm, exiting ...')
        return;
    }

    user.setPersona(0)
    user.gamesPlayed(games);

    setTimeout(async function() {
        console.log('Stopping farming after '+delay +' seconds ..')
        await user.gamesPlayed();
        console.log('Removed all previous games ..')
        games = [];
        console.log('Restarting process')
        await prestart();
    }, delay* 1000);
}