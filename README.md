# hcode

summary
1 basic
2 java
3 



1 BASIC-----------------------------------------------------------------------

SUJET : https://drive.google.com/file/d/0Bz65c6SucTWATW9ZSmNBU1RZelU/view?usp=sharing
HASH JUDGE : https://hashcodejudge.withgoogle.com/
TEST IT ONLINE : https://jsfiddle.net/nzaero/ys2cd7we/#&togetherjs=eBgwjtUs8w

2 UNIX dependency (pas obligatoire)-----------------------------------------------------------------------

 paoloantinori/hhighlighter: https://github.com/paoloantinori/hhighlighter#screenshots
curl http://beyondgrep.com/ack-2.08-single-file > ~/bin/ack && chmod 0755 !#:3

3 JAVA SECTION-----------------------------------------------------------------------

HOW TO GENERATE THE ARCHETYPE USED :  https://github.com/akiraly/reusable-poms

# COMPILE sans test
alias   c='mvn clean install -U -Dgpg.skip=true    -DskipTests  2>&1        |  h -i $MVN_ALL'

# COMPILE avec test
alias  ct='mvn clean install -U -Dgpg.skip=true                 2>/dev/null    | grep -v "DATABASECHANGELOG|executed|changeset|expected\ postgresql,\ got\ h2|Successfully\ released\ change\ log\ lock|Successfully\ acquired\ change\ log\ lock"   |  h -i $MVN_ALL'



