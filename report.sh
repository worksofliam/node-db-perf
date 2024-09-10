echo "" > pool-promise.txt

npm run start odbc p 50 >> pool-promise.txt

npm run start odbcCustom p 50 >> pool-promise.txt

npm run start mapepire p 50 >> pool-promise.txt

echo "" > pool-await.txt

npm run start odbc pa 50 >> pool-await.txt

npm run start odbcCustom pa 50 >> pool-await.txt

npm run start mapepire pa 50 >> pool-await.txt

echo "" > single-promise.txt

npm run start odbc s 50 >> single-promise.txt

npm run start odbcCustom s 50 >> single-promise.txt

npm run start mapepire s 50 >> single-promise.txt

echo "" > single-await.txt

npm run start odbc sa 50 >> single-await.txt

npm run start odbcCustom sa 50 >> single-await.txt

npm run start mapepire sa 50 >> single-await.txt
