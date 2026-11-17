#!/bin/sh
# tools/deploy-scu.sh
# Copies the site and API to the SCU engineering server, which serves it at
# https://ssl.students.engr.scu.edu/~cjgray/rethread/
#
#     sh tools/deploy-scu.sh
#
# Only files tracked by git are sent, so the local database, uploads and anything uncommitted
# stay behind. The live database in data/ is never overwritten; to start it fresh, delete
# data/rethread.db on the server and the next request rebuilds it from the sample data.
# Needs SSH access to linux.dc.engr.scu.edu (set SCU_USER if you aren't cjgray).
#
# By Charlie Gray - RETHREAD, SCU CSEN 163

set -e
cd "$(dirname "$0")/.."

SCU_USER="${SCU_USER:-cjgray}"
HOST="$SCU_USER@linux.dc.engr.scu.edu"
DEST="/webpages/$SCU_USER/rethread"

git ls-files | rsync -az --files-from=- ./ "$HOST:$DEST/"

# Apache runs PHP as its own user, so it needs read access to everything and write access to the
# database and upload folders. Files Apache created itself (the database, uploads) are skipped.
ssh "$HOST" "find '$DEST' -user '$SCU_USER' -exec chmod a+rX {} + && chmod 777 '$DEST/data' '$DEST/uploads/items'"

echo "Deployed to https://ssl.students.engr.scu.edu/~$SCU_USER/rethread/"
