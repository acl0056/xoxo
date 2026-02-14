using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices.WindowsRuntime;
using Easycoustics.Transition.CircuitEditor.Serializable;
using Easycoustics.Transition.Commands;
using Easycoustics.Transition.Common;
using Easycoustics.Transition.CustomControls;
using Windows.Foundation;
using Windows.Foundation.Collections;
using Windows.UI.Xaml;
using Windows.UI.Xaml.Controls;
using Windows.UI.Xaml.Controls.Primitives;
using Windows.UI.Xaml.Data;
using Windows.UI.Xaml.Input;
using Windows.UI.Xaml.Media;
using Windows.UI.Xaml.Navigation;

// The User Control item template is documented at https://go.microsoft.com/fwlink/?LinkId=234236

namespace Easycoustics.Transition.CircuitEditor.ParametersControls
{
    public sealed partial class SCNParametersControl : UserControl
    {
        private SCN SerializableSCN { get; }
        private string oldElementName;

        public SCNParametersControl()
        {
            this.InitializeComponent();
        }

        public SCNParametersControl(SCN scn)
        {
            this.InitializeComponent();

            SerializableSCN = scn;

            scn.PropertyChanged += handleChangeOfControls;

            handleChangeOfControls(null, null);
        }

        private void handleChangeOfControls(object sender, PropertyChangedEventArgs args)
        {
            SerializableSCN.PropertyChanged -= handleChangeOfControls;

            txtElementName.TextChanged -= ElementNameChanged;
            txtElementName.Text = SerializableSCN.ElementName;
            txtElementName.TextChanged += ElementNameChanged;

            chkBoxPolarity.Checked -= chkPolarity;
            chkBoxPolarity.Unchecked -= unchkPolarity;

            chkBoxPolarity.IsChecked = SerializableSCN.PositivePolarity;

            chkBoxPolarity.Checked += chkPolarity;
            chkBoxPolarity.Unchecked += unchkPolarity;

            boxCapacitance.Value = SerializableSCN.C;
            boxResistance.Value = SerializableSCN.R;
            boxFs.Value = SerializableSCN.Fs;

            SerializableSCN.PropertyChanged += handleChangeOfControls;

        }

        private void ElementNameChanged(object sender, TextChangedEventArgs e)
        {
            if (oldElementName == txtElementName.Text) return;

            var command = new CommandSetValue()
            {
                Component = SerializableSCN,
                Property = "ElementName",
                OldValue = oldElementName,
                NewValue = txtElementName.Text
            };

            executeCommand(command);

            oldElementName = txtElementName.Text;
        }

     

        private void ElementNameFocus(object sender, RoutedEventArgs e)
        {
            oldElementName = SerializableSCN.ElementName;
        }

        private void ChangedFs(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableSCN,
                Property = "Fs",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);

        }

        private void ChangedResistance(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableSCN,
                Property = "R",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);
        }

        private void ChangedCapacitance(object sender, ValueChangedEventArgs args)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableSCN,
                Property = "C",
                OldValue = args.oldValue,
                NewValue = args.newValue
            };

            executeCommand(command);
        }

        private void executeCommand(ICircuitCommand command)
        {
            CircuitEditor.currentInstance.executeCommand(command);
        }

        private void unchkPolarity(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableSCN,
                Property = "PositivePolarity",
                OldValue = SerializableSCN.PositivePolarity,
                NewValue = false
            };

            executeCommand(command);
        }

        private void chkPolarity(object sender, RoutedEventArgs e)
        {
            var command = new CommandSetValue()
            {
                Component = SerializableSCN,
                Property = "PositivePolarity",
                OldValue = SerializableSCN.PositivePolarity,
                NewValue = true
            };

            executeCommand(command);
        }
    }
}
