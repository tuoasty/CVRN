import axios from "axios";

export const robloxUsersApi = axios.create({
    baseURL: "https://users.roblox.com",
    timeout: 10000,
});

export const robloxThumbnailsApi = axios.create({
    baseURL: "https://thumbnails.roblox.com",
    timeout: 10000,
})