# S3 Backup script

Backup your object storage with a bulk download or a smart download based on a history.

## How to use this script

### simple-download

_inside simple-download folder_

1. Run `npm i` to install all the dependencies.

2. Inside **.env** file write your credentials

3. Run `npm run start` or `node index.js` to start the app

![Image of prompt](https://raw.githubusercontent.com/GeoPablo/s3-backup/master/readme-images/simple-download.PNG)

Then you will see the total number of files inside that bucket and the total bytes size of these files.

Your files will be downloaded inside a folder name **backup-[bucket name]-[timestamp of the download]**

### download-with-history

_inside download-with-history_

1. Run `npm i` to install all the dependencies.

2. Inside **.env** file write your credentials

3. Run `npm run start` or `node index.js` to start the app and then for the first run just hit **enter** for the next two questions.

![Image of prompt](https://raw.githubusercontent.com/GeoPablo/s3-backup/master/readme-images/download-with-history-2.PNG)

Firstly it will work just like the **simple-download** script.

This script will create:

- a folder with the following name **backup-[bucket name]-[timestamp of the download]**
- a **json** file with the following name **history-[bucket name]-[timestamp of the download].json**

Inside the json file will be stored the names of the files downloaded.

Now if you want to backup your object storage again you can use these files and only the newly added files will be downloaded.

**TIP** Change the name of the folder from **backup-[bucket name]-[timestamp of the download]** to simply **backup**

![Image of prompt](https://raw.githubusercontent.com/GeoPablo/s3-backup/master/readme-images/download-with-history-3.PNG)

Now run the script again.
And you can see that the script downloaded only the newly added files from the object storage (_in our case - no new file was added_)

![Image of prompt](https://raw.githubusercontent.com/GeoPablo/s3-backup/master/readme-images/download-with-history-4.PNG)

If you want to test this and in order to see that it will only download newly added files, use one of these two options:

- delete one item from the **.json** file and then delete it from the backup folder and run the script again
- add a new image on the storage
