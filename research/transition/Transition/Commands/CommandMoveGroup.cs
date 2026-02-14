using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor;
using Easycoustics.Transition.Common;

namespace Easycoustics.Transition.Commands
{
    public class CommandMoveGroup : ICircuitCommand
    {
        public CommandType CommandType => CommandType.DontCalculate;

        public string Title => "Move Group of selectable elements";

        public List<ICircuitMovable> Elements { get; set; } = new List<ICircuitMovable>();
        public Point2D DistanceVector { get; set; }

        public void execute()
        {
            foreach (var element in Elements)
                element.moveRelativeCommand(DistanceVector);
            
        }

        public void unExecute()
        {
            foreach (var element in Elements)
                element.moveRelativeCommand(-1 * DistanceVector);
        }
    }
}
