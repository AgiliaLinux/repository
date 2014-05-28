#!/bin/sh

DIR=`cd "$(dirname "${BASH_SOURCE[0]}")" && pwd`

ROOT_DIR=${DIR}/..
EXEC_DIR=${ROOT_DIR}/node_modules/.bin
EXTRACTOR=${EXEC_DIR}/extract-pot
COMPILER=${EXEC_DIR}/compile-json
BINARY_DIR=${ROOT_DIR}/node_modules/i18n-abide/bin
LOCALES_DIR=${ROOT_DIR}/i18n
STATIC_DIR=${ROOT_DIR}/templates/static/i18n
LANGUAGES=(en_US ru)


${EXTRACTOR} -t jinja -f html -l ${LOCALES_DIR} ${ROOT_DIR}

for l in ${LANGUAGES[@]}; do
    if [ ! -d "${LOCALES_DIR}/${l}/LC_MESSAGES/" ]; then
        mkdir -p ${LOCALES_DIR}/${l}/LC_MESSAGES/
        msginit --input=${LOCALES_DIR}/templates/LC_MESSAGES/messages.pot \
                --output-file=${LOCALES_DIR}/${l}/LC_MESSAGES/messages.po \
                -l ${l}
    fi
done

# Update locales
PATH=$PATH:${BINARY_DIR} merge-po.sh ${LOCALES_DIR}

# Compile js
mkdir -p ${STATIC_DIR}
$COMPILER ${LOCALES_DIR}/ ${STATIC_DIR}