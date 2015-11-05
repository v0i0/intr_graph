function parse_intr(text) {
    return text.split(";")
        .map(function(a) {return a.trim();})
        .filter(function (a) {return a != "";})
        .map(parse_indiv_intr);
}
function parse_indiv_intr(text) {
    var a = text.split("=");
    var result = {
        mine: function(i) {
            return result.name + ":" + i;
        },
        arg: function(n, i) {
            return result.args[n] + ":" + i;
        }
    };
    if (a.length > 2) alert("Not in SSA!");
    var b = a[0].trim().split(" ").filter(function(a) {return a != '';});
    if (b.length != 2) alert("Not a real declaration");
    result.return_type = b[0];
    result.name = b[1];
    result.kind = "invocation";
    if (a.length == 1) {
        result.kind = "declaration";
        return result;
    }
    var c = a[1].trim().split('(');
    result.intr_name = c[0];
    var intr_args = c[1].trim().split(')')[0].trim();
    result.args = intr_args.split(',').map(function (a) {return a.trim();});
    return result;
}
intr_info = {
    "__m256": {
        width: 8
    },
    "_mm256_permute_ps": {
        content: function(d, i) {
            if (d.args.length != 2) alert("Invalid call of permute!");
            var imm = parseInt(d.args[1]);
            var offs = 4 * Math.floor(i / 4);
            var idx = i % 4;
            var sel = (imm >> (2*idx)) & 3;
            return d.arg(0, sel + offs);
        },
        connect: function(d) {
            var result = [];
            for (var i = 0; i < 8; i++) {
                result.push({from: intr_info["_mm256_permute_ps"].content(d, i), to: d.mine(i)});
            }
            return result;
        }
    },
    "_mm256_max_ps": {
        content: function(d, i) {
            return "max";
        },
        connect: function(d) {
            if (d.args.length != 2) assert("Incorrect invocation of max");
            var result = [];
            for (var i = 0; i < 8; i++) {
                result.push({from: d.arg(0, i), to: d.mine(i)});
                result.push({from: d.arg(1, i), to: d.mine(i)});
            }
            return result;
        }
    },
    "_mm256_permute2f128_ps":  {
        content: function(d, i) {
            if (d.args.length != 3) alert("Invalid call of permute!");
            var imm = parseInt(d.args[2]);
            var offs = 4 * Math.floor(i / 4);
            var idx = i % 4;
            var sel = (imm >> offs) & 3;
            var argsel = Math.floor(sel / 2);
            var argoffs = 4 * (sel % 2)
            return d.arg(argsel, idx + argoffs);
        },
        connect: function(d) {
            var result = [];
            for (var i = 0; i < 8; i++) {
                result.push({from: intr_info["_mm256_permute2f128_ps"].content(d, i), to: d.mine(i)});
            }
            return result;
        }
    }
};
function intr_to_graph(d) {
    var a = d.name + ' [shape=record,label="'+ intr_descriptive(d)+" | "+intr_semantic(d)+'"];\n';
    if (d.kind == "declaration") return a;
    var c = intr_info[d.intr_name].connect(d);
    var b = c.map(function(elem) {
        var f = elem.from.split(":");
        f = f[0] + ":O" + f[1];
        var t = elem.to.split(":");
        t = t[0] + ":I" + t[1];
        return f + " -> " + t + ";\n";
    }).join("\n");
    return a + b;
}
function intr_descriptive(d) {
    if (d.kind == "declaration") return d.name;
    return "{ " + d.name + " | " + d.intr_name + " }";
}
function intr_semantic(d) {
    var a = "";
    var w = intr_info[d.return_type].width;
    var i;
    for (i = 0; i < w; i++) {
        a += "<O" + i + "> " + d.mine(i);
        //a += d.mine(i);
        if (i != w - 1) {
            a += " | ";
        }
    }
    if (d.kind == "declaration") {
        return "{ { " + a.split("<I").join("<O") + " } }";
    }
    var b = "";
    for (i = 0; i < w; i++) {
        b += "<I" + i + "> " + intr_info[d.intr_name].content(d, i);
        //b += intr_info[d.intr_name].content(d, i);
        if (i != w - 1) {
            b += " | ";
        }
    }
    return "{ { " + b + " } | { " + a + " } }";
}
function intr_to_graph_all(d) {
    return "digraph structs {\nnode [shape=record];\n" +
        "graph[splines=line, nodesep=4];\n"+ d.map(intr_to_graph).join("")+"}\n";
}
$(document).ready(function() {
    $("#intr_code_txt").change(function () {
        var intr_repr = parse_intr($("#intr_code_txt").val());
        $("#intr_code_repr").val(JSON.stringify(intr_repr));
        $("#intr_code_graph").val(intr_to_graph_all(intr_repr));
    }).change();
    var parser = new DOMParser();
$("#intr_code_graph").change(function() {
    var svg_src = Viz($("#intr_code_graph").val());
    var svg_elem = parser.parseFromString(svg_src, "image/svg+xml");
    $("#intr_graph").html("")[0].appendChild(svg_elem.documentElement);
}).change();

});
