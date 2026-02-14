using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Easycoustics.Transition.CircuitEditor;
using Easycoustics.Transition.CircuitEditor.OnScreenComponents;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Common;

namespace Easycoustics.Transition.Commands
{
    public class CommandMoveComponent : ICircuitCommand
    {
        public CommandType CommandType => CommandType.DontCalculate;

        public string Title => "Move component " + Component.ToString() + " from Position " + 
              OldPosition.ToString() + " to position " +
              NewPosition.ToString() ;

        public override string ToString() => Title;

        public Point2D OldPosition { get; set; }
        public Point2D NewPosition { get; set; }

        public SerializableComponent Component { get; set; }

        public void execute()
        {
            Component.ComponentPosition = NewPosition;
        }

        public void unExecute()
        {
            Component.ComponentPosition = OldPosition;
        }

    }
}
