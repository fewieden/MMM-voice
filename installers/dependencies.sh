#!/usr/bin/env bash

# Magic Mirror
# Module: MMM-voice
#
# By fewieden https://github.com/fewieden/MMM-voice
# MIT Licensed.

echo -e "\e[0m"
echo '       `/ymNMNds-'
echo '      :mMMMMMMMMMy`'
echo '     .NMMMMMMMMMMMh'
echo '     /MMMMMMMMMMMMN'
echo '     /MMMMMMMMMMMMN                       ``    `.:+oo/.         ``       ``````       `````.`'
echo '     /MMMMMMMMMMMMN           .-:+oy` +syhd-  `/hNMMMMMNs`   `osyhy     -ohmNNmh/` +syhhdmmNM:'
echo '     /MMMMMMMMMMMMN           dMMMMm /MMMMs  :dMMMMMMMMMMs   +MMMM/   -yNMMMMMMMM+.MMMMMMMMMM`'
echo '     /MMMMMMMMMMMMN           mMMMMy dMMMm``sMMMMMMNNMMMMN   dMMMm   +NMMMMMNNMd/ oMMMMmdhyys'
echo '     /MMMMMMMMMMMMN           NMMMM/:MMMM-`yMMMMNy:--dMMMM` .MMMM+  sMMMMMh:--:`  dMMMM. ```'
echo ' `-- /MMMMMMMMMMMMN `-.       MMMMM`dMMMs sMMMMN/    /MMMm  oMMMN` +MMMMN+       .MMMMNshdd+'
echo ' /MM`/MMMMMMMMMMMMN +Nm       MMMMd:MMMm`:MMMMN-     /MMM+  mMMMs `NMMMM:        oMMMMMMMMN/'
echo ' /MM`/MMMMMMMMMMMMN oMm      `MMMModMMM/ yMMMM/      dMMh` -MMMM- /MMMMs         mMMMmo/:-.`'
echo ' :MM.:MMMMMMMMMMMMm oMm      .MMMMoMMMh  mMMMM.    `sMMh`  sMMMd  +MMMM+    `.  -MMMMh/+osy'
echo ' `NMs yMMMMMMMMMMN:`mMs      :MMMNdMMM-  dMMMMh:--+dMMs`   NMMMo  -MMMMm/--+my  oMMMMMMMMMN'
echo '  :NMs./dNMMMMMNy-:dMh`      oMMMNMMMy   /MMMMMMNNMMd/    :MMMM-   oMMMMMNNMMh  mMMMMMMMMMd'
echo '   .yNNy///+++//+dNm+`       hNmdhyso.    /mMMMMMNh/`     yNdhs     :hmNNmho-` -Nmdhso+/:-.'
echo '     .ohmNNmmmNNmy/`         .```          `-/+/-`        .``         `````    `.``'
echo '        `.-NMy-``'
echo '           NMo'
echo '     ......NMy.....`'
echo '     mMMMMMMMMMMMMMo'
echo -e "\e[0m"


# installing packages
echo -e "\e[96m[STEP 1/10] Installing Packages\e[90m"
if sudo apt-get install bison libasound2-dev autoconf automake libtool python-dev swig python-pip -y ;
then
    echo -e "\e[32m[STEP 1/10] Installing Packages | Done\e[0m"
else
	echo -e "\e[31m[STEP 1/10] Installing Packages | Failed\e[0m"
	exit;
fi


# installing sphinxbase
echo -e "\e[96m[STEP 2/10] Installing sphinxbase\e[90m"
cd ~
if [ ! -d "$HOME/sphinxbase" ] ;
then
    if ! git clone https://github.com/cmusphinx/sphinxbase.git ;
    then
        echo -e "\e[31m[STEP 2/10] Installing sphinxbase | Failed\e[0m"
        exit;
    fi
fi

cd sphinxbase
if ! git pull ;
then
    echo -e "\e[31m[STEP 2/10] Installing sphinxbase | Failed\e[0m"
    exit;
fi

./autogen.sh
./configure --enable-fixed
make
sudo make install
echo -e "\e[32m[STEP 2/10] Installing sphinxbase | Done\e[0m"


# installing pocketsphinx
echo -e "\e[96m[STEP 3/10] Installing pocketsphinx\e[90m"
cd ~
if [ ! -d "$HOME/pocketsphinx" ] ;
then
    if ! git clone https://github.com/cmusphinx/pocketsphinx.git ;
    then
        echo -e "\e[31m[STEP 3/10] Installing pocketsphinx | Failed\e[0m"
        exit;
    fi
fi

cd pocketsphinx
if ! git pull ;
then
    echo -e "\e[31m[STEP 3/10] Installing pocketsphinx | Failed\e[0m"
    exit;
fi

./autogen.sh
./configure
make
sudo make install
echo -e "\e[32m[STEP 3/10] Installing pocketsphinx | Done\e[0m"


# exporting paths
echo -e "\e[96m[STEP 4/10] Exporting paths\e[0m"
echo "export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib" >> ~/.bashrc
echo "export PKG_CONFIG_PATH=$PKG_CONFIG_PATH:/usr/local/lib/pkgconfig" >> ~/.bashrc
echo -e "\e[32m[STEP 4/10] Exporting paths |  Done\e[0m"


# installing cmuclmtk-0.7
echo -e "\e[96m[STEP 5/10] Installing cmuclmtk-0.7\e[90m"
cd ~
if [[ -d "$HOME/cmuclmtk-0.7" ]] || ! ( wget https://sourceforge.net/projects/cmusphinx/files/cmuclmtk/0.7/cmuclmtk-0.7.tar.gz ) || ! ( tar -xvzf cmuclmtk-0.7.tar.gz ) ;
then
	echo -e "\e[31m[STEP 5/10] Installing cmuclmtk-0.7 | Failed\e[0m"
	exit;
fi

cd cmuclmtk-0.7
./configure
make
sudo make install
cd ..
rm -f cmuclmtk-0.7.tar.gz
echo -e "\e[32m[STEP 5/10] Installing cmuclmtk-0.7 | Done\e[0m"


# installing tensorflow
echo -e "\e[96m[STEP 6/10] Installing tensorflow\e[90m"
cd ~
if [ -d "$HOME/tensorflow" ] ;
then
	echo -e "\e[31m[STEP 6/10] Installing tensorflow | Failed\e[0m"
	exit;
fi

mkdir tensorflow
cd tensorflow
if ! wget https://github.com/samjabrahams/tensorflow-on-raspberry-pi/raw/master/bin/tensorflow-0.9.0-cp27-none-linux_armv7l.whl ;
then
    echo -e "\e[31m[STEP 6/10] Installing tensorflow | Failed\e[0m"
	exit;
fi
sudo pip install tensorflow-0.9.0-cp27-none-linux_armv7l.whl
echo -e "\e[32m[STEP 6/10] Installing tensorflow | Done\e[0m"


# installing g2p-seq2seq
echo -e "\e[96m[STEP 7/10] Installing g2p-seq2seq\e[90m"
cd ~
if [ ! -d "$HOME/g2p-seq2seq" ] ;
then
    if ! git clone https://github.com/cmusphinx/g2p-seq2seq.git ;
    then
        echo -e "\e[31m[STEP 7/10] Installing g2p-seq2seq | Failed\e[0m"
        exit;
    fi
fi

cd g2p-seq2seq
if ! git pull ;
then
    echo -e "\e[31m[STEP 7/10] Installing g2p-seq2seq | Failed\e[0m"
    exit;
fi

sudo python setup.py install
echo -e "\e[32m[STEP 7/10] Installing g2p-seq2seq | Done\e[0m"


# installing npm dependencies
echo -e "\e[96m[STEP 8/10] Installing npm dependencies\e[90m"
cd ~/MagicMirror/modules/MMM-voice
if npm install ;
then
    echo -e "\e[32m[STEP 8/10] Installing npm dependencies | Done\e[0m"
else
    echo -e "\e[31m[STEP 8/10] Installing npm dependencies | Failed\e[0m"
    exit;
fi


# manipulating dependencies
echo -e "\e[96m[STEP 9/10] Manipulating dependencies\e[90m"
cd ~/MagicMirror/modules/MMM-voice/node_modules/pocketsphinx-continuous
if sed \
-e "/this.verbose = config.verbose;/ a\ this.microphone = config.microphone;" \
-e "/-inmic/ i\ '-adcdev'," \
-e "/-inmic/ i\ 'plughw:' \+ this.microphone," \
-e "/-lm/ a\ 'modules/MMM-voice/' \+" \
-e "/-dict/ a\ 'modules/MMM-voice/' \+" \
index.js -i;
then
    echo -e "\e[32m[STEP 9/10] Manipulating dependencies | Done\e[0m"
else
    echo -e "\e[31m[STEP 9/10] Manipulating dependencies | Failed\e[0m"
    exit;
fi


# installing trained models
echo -e "\e[96m[STEP 10/10] Installing trained models\e[90m"
cd ~/MagicMirror/modules/MMM-voice
if ( wget "https://sourceforge.net/projects/cmusphinx/files/G2P Models/g2p-seq2seq-cmudict.tar.gz" ) && ( tar -xvzf g2p-seq2seq-cmudict.tar.gz ) ;
then
    mv g2p-seq2seq-cmudict model
    rm -f g2p-seq2seq-cmudict.tar.gz
    echo -e "\e[32m[STEP 10/10] Installing trained models | Done\e[0m"
else
	echo -e "\e[31m[STEP 10/10] Installing trained models | Failed\e[0m"
	exit;
fi


# displaying audio devices
echo -e "\e[96m[INFO] Possible Audio Devices to set in config.js\n"
cat /proc/asound/cards