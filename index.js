/**
 * Steps: 
 * 1) Prompt for amazon playlist link
 * 2) Request and Parse amazon playlist 
 * 3) Prompt spotify login
 * 4) Create playlist
 * 5) Add songs to playlist
 */

//mfw spotify wants me to set up a webserver
const { stringify:queryStringify } = require('querystring')
const { get, post } = require('axios').default;
const express = require('express');
const az = require('./amazonscraper');
const app = express();
require('dotenv').config();

function sleep(num){
    return new Promise(res=>setTimeout(res,num))
}
app.get('/', (req, res) => {
    res.redirect('https://accounts.spotify.com/authorize?' + new URLSearchParams({
        client_id:process.env.CLIENT_ID,
        response_type: 'code',
        scope: 'playlist-modify-public user-read-email',
        redirect_uri: `http://localhost:${process.env.PORT}/callback`,
    }).toString())
})

app.get('/callback', async (req, res) => {
    res.send('a')
    //API request
    let { data } = await post('https://accounts.spotify.com/api/token/', queryStringify({
        code: req.query.code,
        redirect_uri: `http://localhost:${process.env.PORT}/callback`,
        grant_type: 'authorization_code',
        client_id:process.env.CLIENT_ID,
        client_secret:process.env.CLIENT_SECRET
    }), {
        headers: {
            'Content-Type':'application/x-www-form-urlencoded'
        }
    }).catch(res => console.error(res.response))

    console.log('Authorized')

    const authheader = {
        headers: {
            'Authorization': `${data.token_type} ${data.access_token}`,
            'Content-Type': `application/json`
        }
    }

    //Get User Info
    let { data:userinfo } = await get('https://api.spotify.com/v1/me', authheader).catch(res => console.error(res.response))
    
    console.log('User Info Recieved')

    //Create Playlist
    let { data:plinfo } = await post(`https://api.spotify.com/v1/users/${userinfo.id}/playlists`, {
        name: 'Imported from Amazon Music'
    }, authheader).catch(res => console.error(res.response))

    console.log('Playlist Created')

    let songlist = await az(process.env.AMAZON_PLAYLIST_LINK);

    console.log('Songs initialized')

    let idlist = [];
    for(let song of songlist){
        await get('https://api.spotify.com/v1/search?'+ queryStringify({
            q:song,
            type:'track'
        }), authheader).catch(res => console.error(res.response))
            .then(({ data:trdata }) => {
                try{
                    idlist.push(trdata.tracks.items[0].uri)
                } catch {
                    console.error('ERROR WITH FOLLOWING TRACK')
                    console.log(song);
                    console.log(trdata);
                }
            })
        sleep(500); //I fear ratelimits
    }

    console.log('Song IDs parsed')

    post(`https://api.spotify.com/v1/playlists/${plinfo.id}/tracks`,{
        uris:idlist
    }, authheader).catch(res => console.error(res.response))

    console.log('Finished')
    
})

app.listen(process.env.PORT, () => {
    console.log('Up and running!')
})
