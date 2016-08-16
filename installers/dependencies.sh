#!/usr/bin/env bash

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

if sudo apt-get install bison libasound2-dev autoconf automake libtool python-dev swig python-pip -y; then
    echo -e "\e[32mInstalling Dependencies |  Done\e[0m"
else
	echo -e "\e[31mInstalling Dependencies | Failed\e[0m"
	exit;
fi

cd ~
if [ -d "$HOME/sphinxbase" ] || [ -d "$HOME/sphinxbase-master" ] ; then
	echo -e "\e[33mIt seems like sphinxbase is already installed."
	echo -e "To prevent overwriting, the installer will be aborted."
	echo -e "Please rename the \e[1m~/sphinxbase \e[33mor \e[1m~/sphinxbase-master\e[33m folder and try again.\e[0m"
	exit;
fi
wget https://github.com/cmusphinx/sphinxbase/archive/master.zip
tar -xvzf sphinxbase-master.zip
mv sphinxbase-master sphinxbase
cd sphinxbase
./autogen.sh
./configure --enable-fixed
make
sudo make install

cd ~
if [ -d "$HOME/pocketsphinx" ] || [ -d "$HOME/pocketsphinx-master" ] ; then
	echo -e "\e[33mIt seems like pocketsphinx is already installed."
	echo -e "To prevent overwriting, the installer will be aborted."
	echo -e "Please rename the \e[1m~/pocketsphinx \e[33mor \e[1m~/pocketsphinx-master\e[33m folder and try again.\e[0m"
	exit;
fi
wget https://github.com/cmusphinx/pocketsphinx/archive/master.zip
tar -xvzf pocketsphinx-master.zip
mv pocketsphinx-master pocketsphinx
cd pocketsphinx
./autogen.sh
./configure
make
sudo make install

echo "export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/local/lib" >> ~/.bashrc
echo "export PKG_CONFIG_PATH=$PKG_CONFIG_PATH:/usr/local/lib/pkgconfig" >> ~/.bashrc

cd ~
if [ -d "$HOME/cmucltk" ] || [ -d "$HOME/cmuclmtk-0.7" ] ; then
	echo -e "\e[33mIt seems like cmucltk is already installed."
	echo -e "To prevent overwriting, the installer will be aborted."
	echo -e "Please rename the \e[1m~/cmuclmtk \e[33mor \e[1m~/cmuclmtk-0.7\e[33m folder and try again.\e[0m"
	exit;
fi
wget https://sourceforge.net/projects/cmusphinx/files/cmuclmtk/0.7/cmuclmtk-0.7.tar.gz
tar -xvzf cmuclmtk-0.7.tar.gz
mv cmuclmtk-0.7 cmuclmtk
cd cmuclmtk
./configure
make
sudo make install

cd ~
if [ -d "$HOME/tensorflow" ] ; then
	echo -e "\e[33mIt seems like tensorflow is already installed."
	echo -e "To prevent overwriting, the installer will be aborted."
	echo -e "Please rename the \e[1m~/tensorflow\e[33m folder and try again.\e[0m"
	exit;
fi
mkdir tensorflow
cd tensorflow
wget https://github.com/samjabrahams/tensorflow-on-raspberry-pi/raw/master/bin/tensorflow-0.9.0-cp27-none-linux_armv7l.whl
sudo pip install tensorflow-0.9.0-cp27-none-linux_armv7l.whl


cd ~
if [ -d "$HOME/g2p-seq2seq" ] || [ -d "$HOME/g2p-seq2seq-master" ] ; then
	echo -e "\e[33mIt seems like g2p-seq2seq is already installed."
	echo -e "To prevent overwriting, the installer will be aborted."
	echo -e "Please rename the \e[1m~/g2p-seq2seq \e[33mor \e[1m~/g2p-seq2seq-master\e[33m folder and try again.\e[0m"
	exit;
fi
wget https://github.com/cmusphinx/g2p-seq2seq/archive/master.zip
tar -xvzf g2p-seq2seq-master.zip
mv g2p-seq2seq-master g2p-seq2seq
cd g2p-seq2seq
sudo python setup.py install