const puppet = require('puppeteer');

function sleep(num){
    return new Promise(res=>setTimeout(res,num))
}

/**
 * @param {puppet.Page} page 
 * @returns {Promise<string[]>}
 */
async function getAllSongs(page){
    return new Promise(async (res, rej) => {
        let songcollector = [];
        let a;
        while (true) {
            await sleep(2000); //wait for load levels NEEDED 
            let result = await page.evaluate(() => {
                let songs = [];
                try {
                    document.querySelectorAll('music-image-row').forEach((elem) => {
                        if(elem.primaryText === undefined) return;
                        songs.push(`${elem.primaryText} ${elem.secondaryText2}`);
                    });
                    return songs;
                } catch (e){
                    return e.message;
                }
            })
            await page.mouse.wheel({ deltaY: 1000 });
            if(typeof result === 'string') {
                rej(result);
                break;
            }
            if(JSON.stringify(a) === JSON.stringify(result)) break;
            a = result;
            songcollector.push(...result);
        } 
        res([...new Set(songcollector)]);
    });
}

/**
 * @param {string} pl Playlist Link
 * @returns {string[]}
 */
module.exports = (pl) => {
    return new Promise((res, rej) => {
        puppet.launch()
            .then(async browser => {
            let page = await browser.newPage();

            await page.goto(pl);
            await sleep(2000);

            let songs = await getAllSongs(page).catch(rej);
            await browser.close();
            res(songs);
            })
    })
}
