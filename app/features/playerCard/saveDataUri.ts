export function saveDataUri(dataUri: string, fileName: string) {
    const link = document.createElement('a')
    link.href = dataUri
    link.download = fileName
    link.click()
}
