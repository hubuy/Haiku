var global_hashTag;
var h = {
    freshPage: true,
    delay: 20,
    pattern: [5,7,5],
        
    onLoad: function() {
        // we want the page to update as the user types
        $('#user-text').bind('keyup', this.onKeyUp);
        $('#user-text').bind('blur', this.onKeyUp);
        $('#user-text').bind('change', this.hideShareOptions);
        
        // select the content for a tweet if the user clicks that text
        $('#copy-and-paste').bind('click', function() { this.select(); });
        $('#short-link').bind('click', function() { this.select(); });
        
        // if there is a haiku on the url, pull it out and put it in the fields
        var haiku = window.location.hash.replace(/[#]/, '');
        if (haiku) {
            haiku = haiku.split('#')[0];
            $('#user-text').get(0).value = decodeURIComponent(haiku)
                                            .replace(/\s+/g, ' ')
                                            .replace(/[\/]\s*/g, '\n').trim();
            
            // read in the user text
            this.readInUserText();

            // handle the share info
            $('#share-container').removeClass('hidden');
        }
        
    },
        
    onKeyUp: function() {
        h.readInUserText();
    },
    
    readInUserText: function() {
        var html = $('#user-text').get(0).value
                    .toLowerCase()
                    .replace(/\s\/\s/g, '\n')
                    .replace(/[-]/g, '@@')
                    .replace(/\s+/g, ' ')
                    .replace(/[&]/g, '%26')
                    .trim();
        $('#hyphenate-user-text').html(html);
        if (html) {
            $('#rows').removeClass('hidden');
        } else {
            $('#rows').addClass('hidden');
        }
        
        if (h.timeout) clearTimeout(h.timeout);
        h.timeout = window.setTimeout(h.runHyphenator, h.delay);
    },
        
    runHyphenator: function() {
        var textWithHyphens = Hyphenator.hyphenate($('#hyphenate-user-text').html(), 'en');
        $('#hyphenate-user-text').html(textWithHyphens);
        h.updateSyllableCounts();
        delete h.timeout;
    },
    
    toggleAnnotation: function() {
        $('#rows').toggleClass('annotated');
    },
        
    updateSyllableCounts: function() {
        // grab the words
        var words = $('#hyphenate-user-text').html().trim().split(' ');
        
        // then count the syllables in each word, putting the proper syllables 
        // along word boundaries into the display lines
        var totalSyllables = 0;
        var textSoFar = '';
        var lines = ['', '', ''];
        var pIndex = 0;
        for (var w=0; w<words.length; w++) {
            if (pIndex > 2)  pIndex = 2;  // only 3 lines allowed
            var newWord = words[w];
            var syllables = newWord.split(/@@|[-]/).length;
            var isLastWord = w == words.length - 1;
            // if this new word fits on this line, add it to the buffer
            if (totalSyllables + syllables < h.pattern[pIndex]) {
                textSoFar = textSoFar + ' ' + newWord;
                totalSyllables += syllables;
                // if this is the last word, flush the buffer
                if (isLastWord) {
                    $('#exposed-line-' + pIndex).html(decodeURIComponent(textSoFar.trim()));
                    lines[pIndex] = textSoFar.trim();
                    pIndex++;
                }
            } 
            // if this new word perfectly fills out the line, add to and flush the buffer
            else if (totalSyllables + syllables == h.pattern[pIndex]) {
                textSoFar = textSoFar + ' ' + newWord;
                $('#exposed-line-' + pIndex).html(decodeURIComponent(textSoFar.trim()));
                lines[pIndex] = textSoFar.trim();
                if (pIndex < 2) {
                    textSoFar = '';
                    totalSyllables = 0;
                }
                pIndex++;
            } 
            // this new word needs to spill to the next line, so flush the existing buffer 
            // and then start a new buffer with this new word
            else {
                $('#exposed-line-' + pIndex).html(decodeURIComponent(textSoFar.trim()));
                lines[pIndex] = textSoFar.trim();
                textSoFar = newWord;
                totalSyllables = syllables;
                pIndex++;
                if (isLastWord) {
                    $('#exposed-line-' + pIndex).html(decodeURIComponent(textSoFar.trim()));
                    lines[pIndex] = textSoFar.trim();
                    pIndex++;
                }
            }
        }
        while (pIndex < 3) {
            $('#exposed-line-' + pIndex).html('');
            lines[pIndex++] = '';
        }

        var twitterStr = "";
        var isTextInEveryRow = true;
        var is575 = true;
        for (var num=0; num<3; num++) {
//            twitterStr += $('#exposed-line-' + num).html().replace(/[-]/g, '').replace(/@@/g, '-');
            twitterStr += lines[num].replace(/[-]/g, '').replace(/@@/g, '-');
            twitterStr += num < 2 ? " / " : "";
//            var hyphenated = $('#exposed-line-' + num).html().trim();
            var hyphenated = lines[num].trim();
            var count = hyphenated.split(/\s+|[-]|@@/).length;
            hyphenated = hyphenated.replace(/\s+/g, '</span> <span>')
                                   .replace(/[-]/g, '</span><span>')
                                   .replace(/@@/g, '-</span><span>');
            if (hyphenated) {
                $('#exposed-line-' + num).html('<span>' + decodeURIComponent(hyphenated) + '</span>');
                $('#syllable-count-' + num).html(count);
            } else {
                isTextInEveryRow = false;
                $('#exposed-line-' + num).html('');
                $('#syllable-count-' + num).html('');
            }
            if (count == h.pattern[num]) {
                $('#syllable-count-' + num).removeClass('error');
            } else {
                is575 = false;
                $('#syllable-count-' + num).addClass('error');
            }
        }
        if (is575) {
            $('#share-container').removeClass('hidden');
            this.twitterStr = decodeURIComponent(twitterStr);
            this.updateHash(twitterStr);
            if (this.freshPage && is575) {
                this.getShortLink();
            }
        } else {
            $('#share-container').addClass('hidden');
            this.updateHash("");
            this.hideShareOptions();
        }
        if (is575) {
            $('#status').removeClass('hidden');
        } else {
            $('#status').addClass('hidden');
        }
        this.freshPage = false;
    },
    
    hideShareOptions: function() {
        $('#share-options').addClass('hidden');
        $('#share-msg').removeClass('hidden');
    },
        
    showShareOptions: function() {
        $('#share-options').removeClass('hidden');
        $('#share-msg').addClass('hidden');
    },
        
    setTwitterValues: function(haiku, shortLink) {
//        if (h.bitlyRes && h.bitlyRes.data && h.bitlyRes.data.long_url != window.location.href)
        var hashTag = global_hashTag || '#haiku';
//        shortLink = shortLink ? ' ' + shortLink : '';
        $('#twitter-link').get(0).href = "http://twitter.com/?status=" + encodeURIComponent([haiku, hashTag, shortLink].join(' ').trim());
//        $('#twitter-link').html(haiku + ' ' + hashTag);
        $('#twitter-link').html('tweet your haiku');
//        $('#twitter-share-button').get(0).setAttribute('data-url', shortLink);
//        $('#twitter-share-button').get(0).setAttribute('data-counturl', 'http://writeahaiku.com');
//        $('#twitter-share-button').get(0).setAttribute('data-text', [haiku, hashTag, shortLink].join(' ').trim());
        $('#copy-and-paste').get(0).value = haiku;
        $('#short-link').get(0).value = shortLink || '&nbsp;';
    },
    
    updateHash: function(newHash) {
        window.location.hash = encodeURIComponent(newHash);
        h.longUrl = window.location.href;
    },
    
    getShortLink: function() {
        
        var longUrl = encodeURIComponent("http://" + window.location.host + window.location.pathname) 
                                         + window.location.hash.replace(/[#]/g, '%23');
        var bitlyHref = 'http://api.bit.ly/v3/shorten?login=zenslug&apiKey=R_6c786702e5048d55ba0d3dec9869c767&longUrl=' 
                        + longUrl + '&format=json&callback=h.getShortLinkCallback';
        var script = document.createElement("script");
        script.src = bitlyHref;
        document.getElementsByTagName("head")[0].appendChild(script);
        h.showShareOptions();
    },
        
    getShortLinkCallback: function(res) {
        h.bitlyRes = res;
        h.setTwitterValues(h.twitterStr, res.data.url);
        
        //h.showShareOptions();
    },
    
    fetchTweets: function() {
        var src = 'http://search.twitter.com/search.json?q=%23haiku&result_type=recent&lang=en&rpp=50&callback=h.renderTweets';
        var script = document.createElement("script");
        script.src = src;
        document.getElementsByTagName("head")[0].appendChild(script);    
    },
    
    renderTweets: function(res) {
        var html = '';
        for (var i in res.results) {
            var r = res.results[i];
            if (r.text.match('http://sbth.me/[^ ]+?')) {
              r.text = r.text.replace(/(http:\/\/sbth.me\/[^ ]*)/, "<a href='$1'>$1</a>");
            }
            html += ''
            + '<div class="tweet">'
            + '  <a class="user-image" href="http://twitter.com/' + r.from_user + '"><img src="' + r.profile_image_url + '"></a>'
            + '  <div class="details">'
            + '    <a class="user-name" href="http://twitter.com/' + r.from_user + '">' + r.from_user + '</a>'
            + '    <div class="text">' + r.text + '</div>'
            + '  </div>'
            + '</div>';
        }

        $('#twitter-results').html(html);
        if (html) {
            $('#tweet-feed').removeClass('hidden');
        } else {
            $('#tweet-feed').addClass('hidden');
        }
    },
    
};
