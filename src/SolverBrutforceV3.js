var SolverBrutforceV3 = {
};
SolverBrutforceV3.computeDistance = function(loc1, loc2) {
    return Math.ceil(Math.sqrt(Math.pow(loc1.x - loc2.x, 2)
    + Math.pow(loc1.y - loc2.y, 2)));
}

SolverBrutforceV3.solveBoard = function(input) {
    // Tools.debug_deep('' + index + ':' + input);
    // assert(!isNaN(output.nb_row), 'nb_row should be a defined number');
    var drone_cmds = [];

    // Tools
    var warehouses_by_type = {};
    for (var it = 0; it < input.warehouses.length; it++) {
        var warehouse = input.warehouses[it];
        Tools.map(function(type, nb_item) {
            if (warehouses_by_type[type]) {
                warehouses_by_type[type].push(warehouse);
            } else {
                warehouses_by_type[type] = [warehouse];
            }
            return [type, nb_item];
        }, warehouse.nb_item_by_type);
    }

    var cost_by_drone_worker_id = {};
    var position_by_drone_worker_id = {};
    var available_drones = []; // when drone have reach it's ending time, the go out of the available status
    for (var i = 0; i < input.nb_drones; i++) {
        cost_by_drone_worker_id[i] = 0;
        position_by_drone_worker_id[i] = input.warehouses[0].loc;
        available_drones.push(i);
    }
    var available_orders = input.orders.slice(); // copy array by ref : Warning : will modify in both, not a deep copy

    // Do everthing to make it work until time limites
    // Brut force V3 : Each drone start by the closest go and back, priority to the drone that have the minimal cost first
    // Take n commandes, use maximum drones, 1 drone per commandes

    // pour chaque mouvements, on calcule l'order optimal, puis on fait un mouvement
    // avec l'optimal. Ensuite on recommance la même idée jusqu'a ce que tous les drones aient fini leur temps ou qu'il n'y ai plus de commandes
    while (available_drones.length > 0 && available_orders.length > 0) {
        var optimal = null;
        for (var drone_av_idx in available_drones) {
            var worker_id = available_drones[drone_av_idx];
            for (var order_av_idx = 0; order_av_idx < available_orders.length; order_av_idx++) {
                var order = available_orders[order_av_idx];
                var order_id = order.id;

                Tools.map(function(type, nb_items) {
                    if (0 === nb_items) {
                        // order have been fullfilled for this type, go to next one
                        return [type, nb_items]; // TODO walk instead of map...
                    }
                    var weight = input.weights_by_type[type];
                    var path_payload = nb_items * weight;
                    Tools.debug_deep('Path payload : ' + path_payload);
                    if (path_payload > input.max_payload) { // OPTIMM : >= ?
                        path_payload = input.max_payload;
                        Tools.debug_deep('Adjusted payload : ' + path_payload);
                    }
                    var path_max_item = Math.floor(path_payload / weight);
                    Tools.debug_deep('Items handled : ' + path_max_item + ' / ' + nb_items);
                    var available_warehouses = warehouses_by_type[type];
                    for (var it = 0; it < available_warehouses.length; it++) {
                        var warehouse = available_warehouses[it];
                        var nb_items_available = warehouse.nb_item_by_type[type];
                        if (nb_items_available === 0) {
                            Tools.debug_deep(
                                'warehouse[{2}] : no item of type {1} available for commande {0} '
                                .format(order_id, type, warehouse.id)
                            );
                            continue;
                        }
                        assert(nb_items_available > 0,
                            'Algo bug, can not have negative item available'
                        );
                        if (path_max_item > nb_items_available) {// OPTIM : >= ?
                            path_max_item = nb_items_available;
                        }

                        var cost = cost_by_drone_worker_id[worker_id];
                        var position = position_by_drone_worker_id[worker_id];
                        var delta_cost_to_warehouse = SolverBrutforceV3.computeDistance(position, warehouse.loc);
                        var delta_cost_to_order = SolverBrutforceV3.computeDistance(warehouse.loc, order.loc);
                        var total_cost = cost + delta_cost_to_warehouse + delta_cost_to_order + 2; // our drone go to warehouse and back home + take 1 turn for loading and 1 turn to deliver
                        if (total_cost < input.nb_turns // Limite to possible move in time availability only
                            && (
                                null === optimal || total_cost < optimal.total_cost
                            )
                        ) {
                            optimal = {
                                drone:worker_id,
                                drone_available_index:drone_av_idx,
                                order:order,
                                order_available_index:order_av_idx,
                                warehouse: warehouse,
                                path_max_item:path_max_item,
                                total_cost:total_cost,
                                type:type,
                            };
                        }
                    }
                    return [type, nb_items]; // TODO : not used return code => should be .walk function
                }, order.nb_item_by_type);
            }
        }

        if (null === optimal) {
            Tools.info('No more optimal found, but still having order or drone available... exiting...');
            break;
        }
        // update board data with the optimal mouvement
        var worker_id = optimal.drone;
        cost_by_drone_worker_id[worker_id] = optimal.total_cost;
        // TODO : should clean available drone not capable to carry product anymore... pb : will never over passe time limite by current algo...
        position_by_drone_worker_id[worker_id] = optimal.order.loc;
        optimal.warehouse.nb_item_by_type[optimal.type] -= optimal.path_max_item;
        Tools.debug_deep('Stock for warehouse[' + it + '] is '
        + warehouse.nb_item_by_type[optimal.type] + ' for type ' + optimal.type);
        optimal.order.nb_item_by_type[optimal.type] -= optimal.path_max_item;
        var order_is_fullfilled = true;
        for (var i = 0; i < optimal.order.nb_item_by_type.length; i++) {
            order_is_fullfilled = order_is_fullfilled
            && 0 === optimal.order.nb_item_by_type[i];
        }
        if (order_is_fullfilled) {
            available_orders.splice(optimal.order_available_index,1);
        }

        // send command with that optimal move
        cmd = {
            type:SolverBrutforce.CMD_LOAD,
            drone_id: worker_id,
            warehouse_id: optimal.warehouse.id,
            product_type: optimal.type,
            nb_items: optimal.path_max_item,
        };
        drone_cmds.push(cmd);
        cmd = {
            type:SolverBrutforce.CMD_DELIVER,
            drone_id: worker_id,
            order_id: optimal.order.id,
            product_type: optimal.type,
            nb_items: optimal.path_max_item,
        };
        drone_cmds.push(cmd);
        Tools.info('nb_orders lefts : ' + available_orders.length);
    }
    Tools.debug(drone_cmds);

    return SolverBrutforce.translate_cmd(drone_cmds);
};
